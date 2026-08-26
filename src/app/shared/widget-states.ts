import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-widget-busy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center text-secondary py-5">
      <span class="spinner-border spinner-border-sm me-2"></span>{{ label() }}
    </div>
  `,
})
export class WidgetBusy {
  readonly label = input.required<string>();
}

@Component({
  selector: 'app-widget-failed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="soft-note text-center">
      <i class="bi bi-wifi-off me-1"></i>{{ label() }}
    </div>
  `,
})
export class WidgetFailed {
  readonly label = input.required<string>();
}
