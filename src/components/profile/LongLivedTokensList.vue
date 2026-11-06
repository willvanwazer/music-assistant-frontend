<template>
  <Card class="gap-5">
    <CardHeader>
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <CardTitle
            class="font-display text-xl font-medium tracking-[-0.01em]"
            >{{ $t("auth.long_lived_tokens") }}</CardTitle
          >
          <CardDescription>
            {{ $t("auth.api_tokens_description") }}
          </CardDescription>
        </div>
        <Button @click="showCreateDialog = true">
          <Plus :size="16" />
          {{ $t("auth.create_token") }}
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div v-if="tokens.length === 0" class="empty-state">
        <div
          class="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary"
        >
          <Key :size="22" class="text-muted-foreground" />
        </div>
        <p class="text-muted-foreground font-medium">
          {{ $t("auth.no_tokens") }}
        </p>
        <p class="text-sm text-muted-foreground mt-1">
          {{ $t("auth.create_token_hint") }}
        </p>
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
            <Key :size="18" class="text-muted-foreground" />
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
            :aria-label="$t('tooltip.revoke_token')"
            @click.stop="emit('revoke', token)"
          >
            <Trash2 :size="16" />
          </Button>
        </div>
      </div>
    </CardContent>
    <CreateTokenDialog
      v-model="showCreateDialog"
      @created="handleTokenCreated"
    />
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
import CreateTokenDialog from "@/components/users/CreateTokenDialog.vue";
import type { AuthToken } from "@/plugins/api/interfaces";
import { Key, Plus, Trash2 } from "@lucide/vue";
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps<{
  tokens: AuthToken[];
}>();

const emit = defineEmits<{
  revoke: [token: AuthToken];
  created: [];
}>();

const showCreateDialog = ref(false);

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};

const handleTokenCreated = () => {
  emit("created");
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
  text-align: center;
}
</style>
