# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The project began tracking changelog from version 0.0.8.

View NPM package at https://www.npmjs.com/package/@reffy/infinite-canvas

## [0.1.1] - 2025-12-22

### Fixed

- A minor error in the build pipeline was found

## [0.1.0] - 2025-12-22

### Fixed

- A minor bug was causing issue when trying to introduce new function to capture thumbnail

### Added

- Add new thumbnail capture API method

### Updated

- Build process has been updated to only focus on module release

## [0.0.13] - 2025-12-15

### Fixed

- Fix bug with multibounding box not flipping content to correct position

## [0.0.12] - 2025-12-14

### Added

- GitHub Pages site

### Fixed

- Change stat.js to dev only
- Update TS target and lib to ES2022
- Fix canvas import which did not replace img src properly

## [0.0.11] - 2025-12-14

### Fixed

- Using low resolution of added image was based on the portion of camera viewport occupied by image. This has been changed to be based on the user's screen dimension instead.
- Component was not resizing its canvas when the browser window itself is updated. Add event listener to trigger a recalculation of where the canvas anchor should be.

## [0.0.10] - 2025-12-14

### Added

- Add helper method to convert numerical value to CSS appropriate values

### Fixed

- When deployed as a component to React, the component does not get updated when properties change. Update the component to rely on reflect and update method to stay consistent.
- Build commands

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

[0.1.0]: https://github.com/trash-lobster/reffy-infinite-canvas/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/trash-lobster/reffy-infinite-canvas/compare/v0.0.13...v0.1.0
[0.0.13]: https://github.com/trash-lobster/reffy-infinite-canvas/compare/v0.0.12...v0.0.13
[0.0.12]: https://github.com/trash-lobster/reffy-infinite-canvas/compare/v0.0.11...v0.0.12
[0.0.11]: https://github.com/trash-lobster/reffy-infinite-canvas/compare/v0.0.10...v0.0.11
[0.0.10]: https://github.com/trash-lobster/reffy-infinite-canvas/compare/v0.0.9...v0.0.10
[0.0.9]: https://github.com/trash-lobster/reffy-infinite-canvas/compare/v0.0.8...v0.0.9
[0.0.8]: https://github.com/trash-lobster/reffy-infinite-canvas/releases/tag/v0.0.8
