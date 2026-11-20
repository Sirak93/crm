<script setup lang="ts">
import type { ILatestDocumentRow } from '../../interfaces/ILatestDocumentRow';
import type { RouteName } from '../../constants/constants';
import { formatDateTimeShort } from '../../utils/format';

defineProps<{
  rows: ILatestDocumentRow[];
  /** The document page each row links to. */
  routeName: RouteName;
  emptyText: string;
}>();
</script>

<template>
  <p v-if="!rows.length" class="latest-empty">{{ emptyText }}</p>
  <ul v-else class="latest-list">
    <li v-for="row in rows" :key="row.uuid">
      <router-link :to="{ name: routeName, params: { uuid: row.uuid } }" class="latest-row">
        <span class="latest-row__main">
          <span class="latest-row__number">{{ row.number }}</span>
          <span class="latest-row__detail">{{ row.detail || '—' }}</span>
        </span>
        <span class="latest-row__side">
          <span class="latest-row__value">{{ row.value }}</span>
          <span class="latest-row__date">{{ formatDateTimeShort(row.date) }}</span>
        </span>
      </router-link>
    </li>
  </ul>
</template>

<style scoped>
.latest-empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.latest-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.latest-list li + li {
  border-top: 1px solid var(--border);
}

.latest-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.25rem;
  color: var(--text-main);
  text-decoration: none;
  border-radius: var(--radius);
  transition: var(--transition);
}

.latest-row:hover {
  background-color: var(--bg-muted);
}

.latest-row:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.latest-row__main,
.latest-row__side {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.latest-row__side {
  align-items: flex-end;
  flex-shrink: 0;
}

.latest-row__number,
.latest-row__value {
  font-size: var(--text-sm);
  font-weight: 700;
}

.latest-row__detail,
.latest-row__date {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.latest-row__detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
