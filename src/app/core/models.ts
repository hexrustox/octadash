export interface GitHubOwner {
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface GitHubLicense {
  key: string;
  name: string;
  spdx_id: string | null;
}

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubOwner;
  html_url: string;
  description: string | null;
  fork: boolean;
  homepage: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  size: number;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count?: number;
  license: GitHubLicense | null;
  topics?: string[];
}

export interface SearchResultPage {
  totalCount: number;
  incomplete: boolean;
  repos: Repo[];
}

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface CommitWeek {
  week: number;
  total: number;
}

export interface ReleaseInfo {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  html_url: string;
  prerelease: boolean;
}
