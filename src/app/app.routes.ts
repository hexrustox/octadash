import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/search/search.page').then((m) => m.SearchPage),
    title: 'octadash · Search',
  },
  {
    path: 'repo/:owner/:name',
    loadComponent: () => import('./features/repo/repo-dashboard.page').then((m) => m.RepoDashboardPage),
    title: 'octadash',
  },
  { path: '**', redirectTo: '' },
];
