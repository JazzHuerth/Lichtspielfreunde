import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const programm = defineCollection({
	loader: glob({ base: './src/content/programm', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		screeningDate: z.coerce.date(),
		time: z.string().default('20:00 Uhr'),
		quarter: z.string().default('1. Quartal 2025'),
		month: z.string().optional(),
		director: z.string().optional(),
		year: z.number().optional(),
		country: z.string().optional(),
		duration: z.string().optional(),
		genre: z.string().optional(),
		fsk: z.string().optional(),
		language: z.string().optional(),
		specialNote: z.string().optional(),
		heroImage: z.string().optional(),
		highlight: z.boolean().default(false),
		location: z.string().default('Kino Lichtspielsaal'),
	}),
});

export const collections = { programm };
