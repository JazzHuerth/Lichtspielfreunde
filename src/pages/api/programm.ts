import type { APIRoute } from 'astro';
import crypto from 'node:crypto';

export const prerender = false; // Server-side route

// Timing-safe password check
function verifyPassword(providedPassword: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'lichtspiel2025';

  const bufA = Buffer.from(providedPassword);
  const bufB = Buffer.from(adminPassword);

  if (bufA.length !== bufB.length) {
    // Constant time dummy comparison to avoid length leakage
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Helper to push a file via GitHub REST API
async function commitToGitHub(path: string, contentBase64: string, message: string) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // format: "JazzHuerth/Lichtspielfreunde"
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN oder GITHUB_REPO Umgebungsvariable fehlt.');
  }

  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  // Check if file already exists to get its SHA (required for updates)
  let sha: string | undefined;
  const getRes = await fetch(`${url}?ref=${branch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Lichtspielfreunde-Admin',
    },
  });

  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
  }

  // Create or update file
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Lichtspielfreunde-Admin',
    },
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errorBody = await putRes.text();
    throw new Error(`GitHub API Fehler (${putRes.status}): ${errorBody}`);
  }

  return await putRes.json();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const password = authHeader?.replace(/^Bearer\s+/i, '') || '';

    if (!verifyPassword(password)) {
      return new Response(JSON.stringify({ error: 'Ungültiges Passwort' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { slug, frontmatter, markdownBody, imageBase64, imageFileName } = body;

    if (!slug || !frontmatter) {
      return new Response(JSON.stringify({ error: 'Fehlende Pflichtfelder (slug, frontmatter)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. If an image was uploaded, commit it to public/images/programm/
    let posterPath = frontmatter.poster;
    if (imageBase64 && imageFileName) {
      const cleanImgName = imageFileName.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
      const gitImgPath = `public/images/programm/${cleanImgName}`;
      await commitToGitHub(
        gitImgPath,
        imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        `feat(programm): Plakat für ${frontmatter.title} hochladen`
      );
      posterPath = `/images/programm/${cleanImgName}`;
    }

    // 2. Assemble Markdown Frontmatter
    const mdContent = `---
title: "${frontmatter.title.replace(/"/g, '\\"')}"
originalTitle: "${(frontmatter.originalTitle || '').replace(/"/g, '\\"')}"
director: "${frontmatter.director.replace(/"/g, '\\"')}"
year: ${Number(frontmatter.year)}
runtime: ${Number(frontmatter.runtime)}
fsk: "${frontmatter.fsk}"
genre:
${frontmatter.genre.map((g: string) => `  - "${g.trim()}"`).join('\n')}
showtime: "${frontmatter.showtime}"
poster: "${posterPath}"
highlight: ${Boolean(frontmatter.highlight)}
synopsis: "${frontmatter.synopsis.replace(/"/g, '\\"')}"
trailerUrl: "${frontmatter.trailerUrl || ''}"
ticketUrl: "${frontmatter.ticketUrl || ''}"
---

${markdownBody || frontmatter.synopsis}
`;

    // 3. Commit Markdown file to src/content/programm/{slug}.md
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const gitMdPath = `src/content/programm/${cleanSlug}.md`;
    const mdBase64 = Buffer.from(mdContent, 'utf-8').toString('base64');

    await commitToGitHub(
      gitMdPath,
      mdBase64,
      `feat(programm): Film "${frontmatter.title}" hinzugefügt/bearbeitet`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Film "${frontmatter.title}" wurde erfolgreich gespeichert.`,
        slug: cleanSlug,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Serverfehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
