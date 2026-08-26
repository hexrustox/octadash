# octadash

octadash is a browser application for searching GitHub repositories and inspecting a single repository's activity at a glance. It owns no data of its own: everything it shows is a live projection of GitHub.

## Language

**Repo**:
A GitHub repository, identified by its `owner/name` pair. octadash never mutates a Repo; it only reads and displays it.
_Avoid_: project, repository card, package

**Owner**:
The account a Repo belongs to — a user or an organization, treated identically.
_Avoid_: user, org, account, namespace

**Search**:
One GitHub repository search together with its parameters: text query, language filter, minimum-stars filter, license filter, and sort order. A Search is fully encoded in the URL; refreshing or sharing it reproduces it exactly.
_Avoid_: query (reserved for the free-text part of a Search)

**Results Feed**:
The scrollable list of Repos produced by one Search, loaded incrementally page by page. Lives only for the current session.
_Avoid_: list, grid, table

**Repo Dashboard**:
The per-Repo detail view: header info, Snapshot cards, commit activity, language breakdown, and contributors leaderboard for exactly one Repo.
_Avoid_: detail page, repo view, overview

**Snapshot**:
A single point-in-time statistic about a Repo (stars, forks, watchers, open issues, license, latest release) as shown in one dashboard card. Snapshots are read-once values, not tracked over time.
_Avoid_: metric, stat, counter

**Star**:
GitHub's star count (`stargazers_count`). Labeled "Stars" in the UI, GitHub's own vocabulary used verbatim.
_Avoid_: like, favorite, bookmark

**Watcher**:
GitHub's watcher count (`subscribers_count`) — people who have explicitly subscribed to a Repo's notifications. Labeled "Watchers" per GitHub's wording, even though "watching" colloquially includes stargazers.
_Avoid_: follower, subscriber
