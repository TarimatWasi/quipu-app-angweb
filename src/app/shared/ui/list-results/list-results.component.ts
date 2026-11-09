import { Component, input, output } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { ShowMoreComponent } from '@shared/ui/show-more/show-more.component';

/** What an empty list says: its heading and what to do about it. */
export interface EmptyText {
  readonly heading: string;
  readonly text: string;
}

/**
 * The results of a paged list under its filters (A2, A4): the table or the cards the screen
 * projects while there are rows; otherwise «Ningún … coincide con los filtros» with «Quitar
 * filtros», or the empty state of the list. A failed first page shows the error instead of the
 * empty state; a failed next page shows it under the rows, and «Mostrar más» asks the next one.
 */
@Component({
  selector: 'app-list-results',
  imports: [EmptyStateComponent, LoadErrorComponent, ShowMoreComponent],
  template: `
    <div class="list">
      @if (listFailed()) {
        <app-load-error [message]="errorText()" [retrying]="retrying()" (retry)="retry.emit()" />
      }
      @if (shown() > 0) {
        <ng-content />
      } @else if (filtered() && !listFailed()) {
        <app-empty-state
          [heading]="noMatchHeading()"
          [filtered]="true"
          (clearFilters)="clearFilters.emit()"
        />
      } @else if (!listFailed()) {
        <app-empty-state [heading]="empty().heading"
          >{{ empty().text
          }}<ng-container ngProjectAs="[emptyAction]"
            ><ng-content select="[emptyAction]"
          /></ng-container>
        </app-empty-state>
      }
    </div>

    @if (moreFailed()) {
      <app-load-error
        class="more-error"
        [message]="errorText()"
        [retrying]="retrying()"
        (retry)="retry.emit()"
      />
    } @else if (hasMore() && !listFailed()) {
      <app-show-more
        [summary]="false"
        [shown]="shown()"
        [loaded]="loaded()"
        [hasMore]="true"
        [loading]="loadingMore()"
        (more)="more.emit()"
      />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .more-error {
      display: block;
      margin-top: 1rem;
    }
  `,
})
export class ListResultsComponent {
  /** The rows that pass the filters, and how many were loaded before them. */
  readonly shown = input.required<number>();
  readonly loaded = input.required<number>();
  readonly filtered = input(false);
  readonly noMatchHeading = input.required<string>();
  readonly empty = input.required<EmptyText>();
  readonly errorText = input.required<string>();
  /** The first page failed. */
  readonly listFailed = input(false);
  /** A page after the first one failed. */
  readonly moreFailed = input(false);
  readonly retrying = input(false);
  readonly hasMore = input(false);
  readonly loadingMore = input(false);

  readonly retry = output();
  readonly clearFilters = output();
  readonly more = output();
}
