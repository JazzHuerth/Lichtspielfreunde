import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const programm = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/programm' }),
  schema: z
    .object({
      title: z.string().default('Ohne Titel'),
      originalTitle: z.string().optional().default(''),
      director: z.string().optional().default('Unbekannt'),
      year: z.union([z.number(), z.string().transform(Number)]).optional().default(2025),

      // Date & Time fields (accepts both screeningDate and showtime)
      screeningDate: z.union([z.coerce.date(), z.string()]).optional(),
      showtime: z.union([z.coerce.date(), z.string(), z.record(z.any())]).optional(),
      date: z.union([z.coerce.date(), z.string()]).optional(),
      time: z.string().optional().default('20:00'),
      month: z.string().optional().default(''),

      // Images & Text
      heroImage: z.string().optional(),
      poster: z.string().optional(),
      duration: z.string().optional(),
      runtime: z.union([z.number(), z.string()]).optional(),
      description: z.string().optional().default(''),
      synopsis: z.string().optional().default(''),
      specialNote: z.string().optional().default(''),
      location: z.string().optional().default('Kino Lichtspiele'),

      fsk: z
        .union([z.string(), z.number()])
        .transform((val) => String(val).replace(/[^0-9]/g, ''))
        .optional()
        .default('12'),

      genre: z
        .union([
          z.string(),
          z.array(z.string()).transform((arr) => arr.join(', ')),
        ])
        .default(''),

      highlight: z.boolean().optional().default(false),
    })
    .passthrough(), // Ensures Astro NEVER strips any fields from your .md files
});

export const collections = { programm };
