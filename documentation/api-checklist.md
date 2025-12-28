# Checklist for API

- Update canvas record key/name [done]
- Return canvas to center [done]
- How much data is being taken up
- Generate thumbnail/snapshot of the canvas

# To Add

- A field that captures the time and date of the last update to the canvas

How often should image files be deleted from history?

# Key Risks

- Unvalidated imports: deserializeCanvas(JSON.parse(data)) runs on untrusted JSON without schema checks; risk of prototype pollution or invalid shapes causing crashes.
- Origin-wide exposure: DefaultLocalStorage stores raw canvas state in localStorage. Any script on the same origin (including via XSS) can read/modify it; no encryption or integrity checks.
- Key collisions: DefaultLocalStorage.changeCanvasKey writes arbitrary keys. Combined with the component’s name attribute, a host could set a key that overwrites unrelated app data on the same origin.
- No size limits: DefaultIndexedDbStorage.write() accepts arbitrary data URLs. Count is capped, but per-entry size is not; large inputs can exhaust memory/disk (DoS).
- Tainted canvas (future): If remote URLs are later supported, loading cross-origin images without proper CORS will taint the canvas and block pixel reads.
- Cache memory pressure: Cache bounds by entry count only; a few very large entries can still cause memory stress.
- Error path robustness: DefaultLocalStorage.read() may return null. JSON.parse(null) in restoreStateFromCanvasStorage throws, which can cascade into inconsistent state (reliability issue that can aid denial-of-service in hostile contexts).

# Recommendations

Schema validation:

- Input checks in write(): Verify data URLs match ^data:image\/[a-z0-9.+-]+;base64, before storing; reject non-image inputs and enforce a max size (e.g., 10–20 MB) by checking base64 length.
- Parse hardening: Wrap JSON.parse in try/catch and ignore or reset corrupted entries. Version your stored schema and migrate or clear on mismatch.
- LRU eviction: Make cache truly LRU by updating entry position on read; continue enforcing CACHE_LIMIT and consider a total byte budget.
