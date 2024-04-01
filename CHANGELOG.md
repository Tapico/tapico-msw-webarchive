# Changelog

## [1.0.1](https://github.com/Tapico/tapico-msw-webarchive/compare/v1.0.0...v1.0.1) (2024-04-01)


### Bug Fixes

* small change to trigger release ([#25](https://github.com/Tapico/tapico-msw-webarchive/issues/25)) ([8f7ecea](https://github.com/Tapico/tapico-msw-webarchive/commit/8f7ecea5ce14d32f4357ed765be1dde437b04ea1))

## [1.0.0](https://github.com/Tapico/tapico-msw-webarchive/compare/v0.5.0...v1.0.0) (2024-04-01)


### ⚠ BREAKING CHANGES

* This commit changes the behaviour how the utility is handling of responses which have a header `content-encoding`, from now on, these headers will be removed from the response sent, as we currently we won't be supporting gzip or brotli encoding and shouldn't be a major issue for development/testing work.

### Features

* **deps:** upgrade the mswjs dependencies ([8100300](https://github.com/Tapico/tapico-msw-webarchive/commit/81003006d55f6eb754fdf4a5079df309531841f0))
* support MSW v2 ([#19](https://github.com/Tapico/tapico-msw-webarchive/issues/19)) ([5527592](https://github.com/Tapico/tapico-msw-webarchive/commit/5527592bd76ce2faca5cfb80d2f25e06da639455))


### Bug Fixes

* fix issue with content-encoding in responses ([#9](https://github.com/Tapico/tapico-msw-webarchive/issues/9)) ([89cf663](https://github.com/Tapico/tapico-msw-webarchive/commit/89cf663a62af1bb3e30e240906997515bad45bde))
* prettierrc misnamed and misconfigured ([#8](https://github.com/Tapico/tapico-msw-webarchive/issues/8)) ([e9f672e](https://github.com/Tapico/tapico-msw-webarchive/commit/e9f672e5178fd5d31f71b087593cf0900fdb44ed))
