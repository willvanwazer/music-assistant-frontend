<template>
  <Card class="gap-5">
    <CardHeader>
      <CardTitle class="font-display text-xl font-medium tracking-[-0.01em]">{{
        $t("auth.active_sessions")
      }}</CardTitle>
      <CardDescription>
        {{ $t("auth.manage_active_sessions") }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="tokens.length === 0" class="empty-state">
        <div
          class="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary"
        >
          <MonitorOff :size="22" class="text-muted-foreground" />
        </div>
        <p class="text-muted-foreground">{{ $t("no_content") }}</p>
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="token in tokens"
          :key="token.token_id"
          class="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0"
        >
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary"
          >
            <Monitor :size="18" class="text-muted-foreground" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="truncate text-sm font-semibold">{{ token.name }}</div>
            <div
              class="flex flex-wrap gap-2 text-[12.5px] text-muted-foreground"
            >
              <span
                >{{ $t("created") }}: {{ formatDate(token.created_at) }}</span
              >
              <span v-if="token.last_used_at">•</span>
              <span v-if="token.last_used_at">
                {{ $t("last_used") }}: {{ formatDate(token.last_used_at) }}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="text-destructive hover:text-destructive hover:bg-destructive/10"
            :aria-label="$t('tooltip.revoke_session')"
            @click.stop="emit('revoke', token)"
          >
            <Trash2 :size="16" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuthToken } from "@/plugins/api/interfaces";
import { Monitor, MonitorOff, Trash2 } from "@lucide/vue";

defineProps<{
  tokens: AuthToken[];
}>();

const emit = defineEmits<{
  revoke: [token: AuthToken];
}>();

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  border: 1px dashed var(--border);
  border-radius: 14px;
}
</style>
