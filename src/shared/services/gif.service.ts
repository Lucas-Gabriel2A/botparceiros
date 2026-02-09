export class GifService {
    async get(category: string): Promise<string | null> {
        // Normalize category
        const searchTerm = category.toLowerCase().trim();
        let key = searchTerm.replace(/-/g, '_');

        // Map "anime_kiss" -> "kiss", "anime_hug" -> "hug" for usage with nekos.best
        // If the key contains "anime_", remove it to get the clean category
        let cleanCategory = key.replace('anime_', '');

        // Valid categories for nekos.best
        const validCategories = [
            'baka', 'bite', 'blush', 'bored', 'cry', 'cuddle', 'dance', 'facepalm',
            'feed', 'happy', 'highfive', 'hug', 'kiss', 'laugh', 'neko', 'pat',
            'poke', 'pout', 'shrug', 'slap', 'sleep', 'smile', 'smug', 'stare',
            'think', 'thumbsup', 'tickle', 'wave', 'wink', 'yeet'
        ];

        // Check if the cleaned category is valid
        if (!validCategories.includes(cleanCategory)) {
            // Try to find a partial match in valid categories
            const partialMatch = validCategories.find(c => cleanCategory.includes(c) || c.includes(cleanCategory));
            if (partialMatch) {
                cleanCategory = partialMatch;
            } else {
                console.warn(`[GifService] Invalid category: ${category}.`);
                return null;
            }
        }

        try {
            const response = await fetch(`https://nekos.best/api/v2/${cleanCategory}`);
            const data = await response.json() as { results: { url: string }[] };
            if (data.results && data.results.length > 0) {
                return data.results[0].url;
            }
        } catch (error) {
            console.error('[GifService] Error fetching from nekos.best:', error);
        }

        return null;
    }
}

export const gifService = new GifService();
