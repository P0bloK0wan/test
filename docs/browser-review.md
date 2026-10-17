# Independent browser review

The browser suite exercises the original Portuguese catalog experience using local authorized film assets. Run from this project with `node tests/browser.mjs`. It launches the system Chromium, starts the project's loopback HTTP server on an ephemeral port, and closes both in `finally`.

The suite checks the hero, all eleven films and artwork decoding, title and accent-insensitive search, genre filtering, saved lists, ratings, independent profiles, persisted playback preferences, Escape and restored focus, real native trailer metadata/playback/seeking/resume, mobile document overflow, and uncaught application errors. It writes `browser-results.json` only after all checks pass; a failed run exits nonzero and removes any old success report. Desktop and mobile screenshots are captured during the run.

External requests are aborted. Official YouTube full-film playback is outside this verification: internet availability, embed permissions, and availability of each remote film remain unverified. APK runtime, iOS, device integration, proprietary Netflix services, and account authentication are outside this original web demo's tested scope.

Source inspection found no immediate blocking issue in the reviewed UI event flows. Actual execution evidence is exclusively the generated JSON report and screenshots; the existence of this review does not assert a passing run.
