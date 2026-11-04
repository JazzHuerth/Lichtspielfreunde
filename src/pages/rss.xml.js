import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const movies = await getCollection('programm');
	return rss({
		title: `${SITE_TITLE} – Kinoprogramm`,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: movies.map((movie) => ({
			title: `${movie.data.title} (${new Date(movie.data.screeningDate).toLocaleDateString('de-DE')} um ${movie.data.time})`,
			description: movie.data.description,
			pubDate: new Date(movie.data.screeningDate),
			link: `/#film-${movie.id}`,
		})),
	});
}
