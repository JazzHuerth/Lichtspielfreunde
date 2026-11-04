import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = false;

// Admin password fallback if not set in environment
const DEFAULT_PASSWORD = 'lichtspiel2025';

function getAdminPassword(): string {
	return process.env.ADMIN_PASSWORD || import.meta.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

function verifyAuth(req: Request): boolean {
	const authHeader = req.headers.get('authorization');
	const queryToken = new URL(req.url).searchParams.get('token');
	const token = authHeader?.replace(/^Bearer\s+/i, '') || queryToken;
	const currentPassword = getAdminPassword();

	if (!token) return false;
	return token === currentPassword;
}

// Generate Markdown file content from movie payload
function generateMarkdown(movie: any): string {
	const frontmatter = [
		'---',
		`title: ${JSON.stringify(movie.title || '')}`,
		`description: ${JSON.stringify(movie.description || '')}`,
		`screeningDate: ${movie.screeningDate || new Date().toISOString().split('T')[0]}`,
		`time: ${JSON.stringify(movie.time || '20:00 Uhr')}`,
		`quarter: ${JSON.stringify(movie.quarter || '1. Quartal 2025')}`,
		`month: ${JSON.stringify(movie.month || '')}`,
		`director: ${JSON.stringify(movie.director || '')}`,
		`year: ${parseInt(movie.year, 10) || new Date().getFullYear()}`,
		`country: ${JSON.stringify(movie.country || '')}`,
		`duration: ${JSON.stringify(movie.duration || '')}`,
		`genre: ${JSON.stringify(movie.genre || '')}`,
		`fsk: ${JSON.stringify(movie.fsk || 'FSK 12')}`,
		`language: ${JSON.stringify(movie.language || '')}`,
		`specialNote: ${JSON.stringify(movie.specialNote || '')}`,
		`heroImage: ${JSON.stringify(movie.heroImage || '/images/programm/casablanca.jpg')}`,
		`highlight: ${Boolean(movie.highlight)}`,
		`location: ${JSON.stringify(movie.location || 'Kino Lichtspielsaal')}`,
		'---',
		'',
		movie.body || `## Über den Film\n\n${movie.description || ''}`,
		'',
	].join('\n');

	return frontmatter;
}

// Commit to GitHub via REST API
async function commitToGitHub(filePath: string, content: string, message: string, token: string, repo: string, branch = 'main') {
	const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
	
	// Check if file exists to get its SHA (required for update)
	let sha: string | undefined;
	try {
		const existingRes = await fetch(`${url}?ref=${branch}`, {
			headers: {
				Authorization: `token ${token}`,
				'User-Agent': 'Lichtspielfreunde-Astro-App',
				Accept: 'application/vnd.github.v3+json',
			},
		});
		if (existingRes.ok) {
			const data = await existingRes.json();
			sha = data.sha;
		}
	} catch (e) {
		console.warn('Could not check existing file on GitHub:', e);
	}

	const base64Content = Buffer.from(content).toString('base64');
	const body: any = {
		message,
		content: base64Content,
		branch,
	};
	if (sha) body.sha = sha;

	const putRes = await fetch(url, {
		method: 'PUT',
		headers: {
			Authorization: `token ${token}`,
			'User-Agent': 'Lichtspielfreunde-Astro-App',
			'Content-Type': 'application/json',
			Accept: 'application/vnd.github.v3+json',
		},
		body: JSON.stringify(body),
	});

	if (!putRes.ok) {
		const err = await putRes.text();
		throw new Error(`GitHub API Error (${putRes.status}): ${err}`);
	}

	return await putRes.json();
}

// GET: Check authentication or list raw markdown files
export const GET: APIRoute = async ({ request }) => {
	const isAuth = verifyAuth(request);
	if (!isAuth) {
		return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const programmDir = path.resolve(process.cwd(), 'src/content/programm');
		let files: string[] = [];
		if (fs.existsSync(programmDir)) {
			files = fs.readdirSync(programmDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
		}

		return new Response(JSON.stringify({ success: true, files }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err: any) {
		return new Response(JSON.stringify({ success: true, files: [], note: err.message }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

// POST: Authenticate or save/delete markdown files
export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const { action, password, movie, slug, token: clientToken } = body;

		// 1. Password Verification Action
		if (action === 'login') {
			const correctPassword = getAdminPassword();
			if (password === correctPassword) {
				return new Response(JSON.stringify({ success: true, token: correctPassword }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} else {
				return new Response(JSON.stringify({ success: false, error: 'Falsches Passwort' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		// All other actions require valid authentication
		const authHeader = request.headers.get('authorization');
		const authToken = authHeader?.replace(/^Bearer\s+/i, '') || clientToken;
		if (authToken !== getAdminPassword()) {
			return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 2. Save / Update Movie Action
		if (action === 'save') {
			if (!movie || !movie.title) {
				return new Response(JSON.stringify({ error: 'Filmtitel ist erforderlich' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Clean slug name
			let fileName = slug || movie.slug;
			if (!fileName) {
				const datePrefix = movie.screeningDate || new Date().toISOString().split('T')[0];
				const sanitizedTitle = movie.title
					.toLowerCase()
					.replace(/ä/g, 'ae')
					.replace(/ö/g, 'oe')
					.replace(/ü/g, 'ue')
					.replace(/ß/g, 'ss')
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-+|-+$/g, '');
				fileName = `${datePrefix}-${sanitizedTitle}.md`;
			}
			if (!fileName.endsWith('.md')) fileName += '.md';

			const markdownContent = generateMarkdown(movie);

			// Handle photo saving if Base64 photo is provided
			let savedImagePath = movie.heroImage;
			if (movie.photoBase64 && movie.photoName) {
				const sanitizedImgName = movie.photoName.replace(/[^a-zA-Z0-9.-]/g, '_');
				const imageRelPath = `/images/programm/${sanitizedImgName}`;
				try {
					const imgBuffer = Buffer.from(movie.photoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
					const localImgDir = path.resolve(process.cwd(), 'public/images/programm');
					if (!fs.existsSync(localImgDir)) fs.mkdirSync(localImgDir, { recursive: true });
					fs.writeFileSync(path.join(localImgDir, sanitizedImgName), imgBuffer);
					savedImagePath = imageRelPath;
				} catch (imgErr) {
					console.warn('Could not save image to disk locally:', imgErr);
				}
			}

			// Method A: Write locally to filesystem if directory is writable (Local dev / Node server)
			let localSaved = false;
			try {
				const localDir = path.resolve(process.cwd(), 'src/content/programm');
				if (!fs.existsSync(localDir)) {
					fs.mkdirSync(localDir, { recursive: true });
				}
				const localFilePath = path.join(localDir, fileName);
				fs.writeFileSync(localFilePath, markdownContent, 'utf-8');
				localSaved = true;
			} catch (fsErr) {
				console.warn('Local filesystem write failed (common on serverless):', fsErr);
			}

			// Method B: If GitHub Token is provided in env or payload, commit directly to GitHub repository
			const ghToken = process.env.GITHUB_TOKEN || movie.githubToken;
			const ghRepo = process.env.GITHUB_REPO || movie.githubRepo;
			const ghBranch = process.env.GITHUB_BRANCH || movie.githubBranch || 'main';
			let githubCommitted = false;

			if (ghToken && ghRepo) {
				try {
					await commitToGitHub(
						`src/content/programm/${fileName}`,
						markdownContent,
						`Film aktualisiert: ${movie.title} [skip ci]`,
						ghToken,
						ghRepo,
						ghBranch
					);
					githubCommitted = true;
				} catch (ghErr: any) {
					console.error('GitHub commit error:', ghErr);
				}
			}

			return new Response(
				JSON.stringify({
					success: true,
					fileName,
					markdown: markdownContent,
					savedImagePath,
					localSaved,
					githubCommitted,
					message: `Film "${movie.title}" erfolgreich als ${fileName} gespeichert!`,
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 3. Delete Movie Action
		if (action === 'delete') {
			if (!slug) {
				return new Response(JSON.stringify({ error: 'Dateiname fehlt' }), { status: 400 });
			}
			const fileName = slug.endsWith('.md') ? slug : `${slug}.md`;
			try {
				const localFilePath = path.resolve(process.cwd(), 'src/content/programm', fileName);
				if (fs.existsSync(localFilePath)) {
					fs.unlinkSync(localFilePath);
				}
			} catch (e) {
				console.warn('Local delete failed:', e);
			}

			return new Response(JSON.stringify({ success: true, message: `Film ${fileName} gelöscht.` }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ error: 'Unbekannte Aktion' }), { status: 400 });
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err.message || 'Serverfehler' }), { status: 500 });
	}
};

