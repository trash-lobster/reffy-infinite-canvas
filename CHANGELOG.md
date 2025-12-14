# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The project began tracking changelog from version 0.0.8


## [0.0.9] - 2025-12-14

### Fixed

- Despite being able to resize the canvas, if the canvas component is moved away from the origin [0, 0], the interactions lose their consistency. Fixed the issue by storing the viewport origins and utilising that for the marquee component and the camera.

### Removed

- Unused dependencies
- Playwright test template

## [0.0.8] - 2025-12-13

### Fixed

- Writing file data to storage takes time and awaiting it to complete impacts the time it takes to add to the canvas visually. We removed the await since the data is already available for us to render the image.

### Changed

- File storage cache limit has been increased from 100 to 500

[0.0.9]: https://github.com/trash-lobster/reffy-infinite-canvas/compare/v0.0.8...v0.0.9
[0.0.8]: https://github.com/trash-lobster/reffy-infinite-canvas/releases/tag/v0.0.8