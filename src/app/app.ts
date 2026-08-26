import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TokenStore } from './core/token-store';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, FormsModule, NgbModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly tokens = inject(TokenStore);
  protected readonly draft = signal('');

  protected save(): void {
    this.tokens.set(this.draft());
    this.draft.set('');
  }

  protected clearDraft(): void {
    this.draft.set('');
    this.tokens.set(null);
  }
}
