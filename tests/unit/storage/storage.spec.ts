import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageFileMetadata } from '../../../src/storage';
import * as util from '../../../src/util';

describe('ImageFileMetadata', () => {
    const DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgXYp3wAAAABJRU5ErkJggg==';

    beforeEach(() => {
      	vi.restoreAllMocks();
    });

		it('initializes and touches on getters', () => {
				const now = 1_700_000_000_000;
				vi.spyOn(Date, 'now').mockReturnValue(now);
				vi.spyOn(util, 'getMimeType').mockReturnValue('image/png');

				const entry = new ImageFileMetadata(DATA_URL);
				expect(entry.created).toBe(now);
				expect(entry.lastRetrieved).toBe(now);
				expect(entry.mimetype).toBe('image/png');

				// lastRetrieved should update on subsequent getter calls
				const later = now + 1234;
				(Date.now as any).mockReturnValueOnce(later);
				entry.dataURL;
				expect(entry.lastRetrieved).toBe(later);
		});

    it('create assigns hashed id', async () => {
		vi.spyOn(util, 'hashStringToId').mockResolvedValue(42 as any);
		const entry = await ImageFileMetadata.create(DATA_URL);
		expect(entry.id).toBe(42);
		expect(entry.dataURL).toBe(DATA_URL);
    });
});
