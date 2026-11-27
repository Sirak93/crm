<script setup lang="ts">
import type { IDocFact } from '../interfaces/IDocFact';

defineProps<{
  /** What the document is - icon labels. */
  facts: IDocFact[];
  /** Who it involves (creator, department, supplier, receiver) - a fixed text label and the name. */
  parties: { key: string; label: string; text: string }[];
  note: string | null;
  noteLabel: string;
}>();
</script>

<template>
  <div class="doc-facts">
    <ul class="doc-facts__list">
      <li
        v-for="fact in facts"
        :key="fact.key"
        :class="['doc-facts__chip', { 'doc-facts__chip--primary': fact.primary }]"
        :title="fact.label"
      >
        <component :is="fact.icon" :size="15" aria-hidden="true" class="doc-facts__icon" />
        <span class="sr-only">{{ fact.label }}:</span>
        <span>{{ fact.text }}</span>
      </li>
    </ul>

    <dl class="doc-facts__parties">
      <div v-for="party in parties" :key="party.key" class="doc-facts__party">
        <dt>{{ $t('common.fieldLabel', { label: party.label }) }}</dt>
        <dd>{{ party.text }}</dd>
      </div>
    </dl>

    <div v-if="note" class="doc-facts__note">
      <span class="doc-facts__note-label">{{ noteLabel }}</span>
      <p class="doc-facts__note-text">{{ note }}</p>
    </div>
  </div>
</template>

<style scoped>
.doc-facts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.doc-facts__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.doc-facts__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border-dark);
  border-radius: 999px;
  background-color: var(--bg-card);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-main);
}

.doc-facts__icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.doc-facts__chip--primary {
  border-color: var(--primary);
  background-color: var(--primary-light);
  color: var(--primary-dark);
  font-weight: 600;
}

.doc-facts__chip--primary .doc-facts__icon {
  color: var(--primary-dark);
}

.doc-facts__parties {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 1.75rem;
  margin: 0;
  font-size: var(--text-sm);
}

.doc-facts__party {
  display: flex;
  gap: 0.375rem;
}

.doc-facts__party dt {
  color: var(--text-muted);
}

.doc-facts__party dd {
  margin: 0;
  font-weight: 500;
  color: var(--text-main);
}

.doc-facts__note {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  background-color: var(--bg-app);
}

.doc-facts__note-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.doc-facts__note-text {
  margin: 0.25rem 0 0;
  font-size: var(--text-sm);
  white-space: pre-wrap;
  color: var(--text-main);
}
</style>
