<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ $t("auth.tokens") }} -
          {{ user?.display_name || user?.username }}
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-6">
        <!-- Active Sessions Section -->
        <div>
          <h3
            class="mt-2 mb-1 font-display text-lg font-medium tracking-[-0.01em]"
          >
            {{ $t("auth.active_sessions") }}
          </h3>
          <p class="mb-4 text-[13px] text-muted-foreground">
            {{ $t("auth.active_sessions_description") }}
          </p>
          <div
            v-if="sessionTokens.length === 0"
            class="flex flex-col items-center justify-center rounded-[14px] border border-dashed py-10"
          >
            <div
              class="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary"
            >
              <Monitor :size="22" class="text-muted-foreground" />
            </div>
            <p class="text-sm text-muted-foreground">
              {{ $t("auth.no_active_sessions") }}
            </p>
          </div>
          <div
            v-else
            class="divide-y divide-border overflow-hidden rounded-[14px] border bg-card"
          >
            <div
              v-for="token in sessionTokens"
              :key="token.token_id"
              class="px-4 py-3"
            >
              <div class="flex items-center gap-3.5">
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary"
                >
                  <Monitor :size="18" class="text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="truncate text-sm font-semibold">
                    {{ token.name }}
                  </div>
                  <div
                    class="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground"
                  >
                    <span>
                      {{ $t("created") }}: {{ formatDate(token.created_at) }}
                    </span>
                    <span
                      v-if="token.last_used_at"
                      class="text-muted-foreground"
                    >
                      •
                    </span>
                    <span v-if="token.last_used_at">
                      {{ $t("last_used") }}:
                      {{ formatDate(token.last_used_at) }}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  :aria-label="$t('tooltip.revoke_session')"
                  @click.stop="emit('revoke', token)"
                >
                  <Trash2 :size="16" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex-1">
              <h3
                class="mb-1 font-display text-lg font-medium tracking-[-0.01em]"
              >
                {{ $t("auth.long_lived_tokens") }}
              </h3>
              <p class="text-[13px] text-muted-foreground">
                {{ $t("auth.long_lived_tokens_description") }}
              </p>
            </div>
            <Button
              v-if="!showCreateForm"
              size="sm"
              @click="showCreateForm = true"
            >
              <Plus :size="16" />
              {{ $t("auth.create_token") }}
            </Button>
            <Button
              v-else
              variant="secondary"
              size="sm"
              @click="showCreateForm = false"
            >
              {{ $t("cancel") }}
            </Button>
          </div>

          <Card v-if="showCreateForm" class="p-4 mb-4 border-primary/20">
            <form id="form-create-token" @submit.prevent="handleCreateToken">
              <form.Field
                name="tokenName"
                :validators="{
                  onChange: tokenNameSchema(t),
                }"
              >
                <template #default="{ field }">
                  <Field :data-invalid="isInvalid(field)">
                    <FieldLabel :for="field.name">
                      {{ $t("auth.token_name") }}
                    </FieldLabel>
                    <Input
                      :id="field.name"
                      :name="field.name"
                      :model-value="tokenName"
                      :aria-invalid="isInvalid(field)"
                      :placeholder="$t('auth.token_name_hint')"
                      autofocus
                      autocomplete="off"
                      @blur="field.handleBlur"
                      @input="
                        (e: Event) => {
                          tokenName = (e.target as HTMLInputElement).value;
                          field.handleChange(
                            (e.target as HTMLInputElement).value,
                          );
                        }
                      "
                    />
                    <FieldError
                      v-if="isInvalid(field)"
                      :errors="field.state.meta.errors"
                    />
                  </Field>
                </template>
              </form.Field>
              <div class="flex justify-end gap-2 mt-4">
                <Button variant="secondary" @click="showCreateForm = false">
                  {{ $t("cancel") }}
                </Button>
                <Button
                  type="submit"
                  :disabled="!canCreate"
                  :loading="creating"
                >
                  {{ $t("create") }}
                </Button>
              </div>
            </form>
          </Card>

          <Card
            v-if="createdToken"
            class="p-4 mb-4 bg-destructive/10 border-destructive/20"
          >
            <p class="text-sm text-muted-foreground">
              {{ $t("auth.copy_new_token_hint") }}
            </p>
            <InputGroup>
              <InputGroupInput
                :model-value="createdToken"
                readonly
                class="font-mono text-sm"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  variant="ghost"
                  @click="copyToken"
                >
                  <Copy :size="16" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <Button
              variant="secondary"
              class="mt-4 w-full"
              @click="handleCloseCreateForm"
            >
              {{ $t("close") }}
            </Button>
          </Card>

          <div
            v-if="longLivedTokens.length === 0"
            class="flex flex-col items-center justify-center rounded-[14px] border border-dashed py-10"
          >
            <div
              class="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary"
            >
              <Key :size="22" class="text-muted-foreground" />
            </div>
            <p class="text-sm text-muted-foreground">
              {{ $t("auth.no_long_lived_tokens") }}
            </p>
          </div>
          <div
            v-else
            class="divide-y divide-border overflow-hidden rounded-[14px] border bg-card"
          >
            <div
              v-for="token in longLivedTokens"
              :key="token.token_id"
              class="px-4 py-3"
            >
              <div class="flex items-center gap-3.5">
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary"
                >
                  <Key :size="18" class="text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="truncate text-sm font-semibold">
                    {{ token.name }}
                  </div>
                  <div
                    class="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground"
                  >
                    <span>
                      {{ $t("created") }}: {{ formatDate(token.created_at) }}
                    </span>
                    <span
                      v-if="token.last_used_at"
                      class="text-muted-foreground"
                    >
                      •
                    </span>
                    <span v-if="token.last_used_at">
                      {{ $t("last_used") }}:
                      {{ formatDate(token.last_used_at) }}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  :aria-label="$t('tooltip.revoke_token')"
                  @click.stop="emit('revoke', token)"
                >
                  <Trash2 :size="16" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="emit('update:modelValue', false)">
          {{ $t("close") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Copy, Key, Monitor, Plus, Trash2 } from "@lucide/vue";
import type { AnyFieldApi } from "@tanstack/form-core";
import { useForm } from "@tanstack/vue-form";
import { useVModel } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { copyToClipboard } from "@/helpers/utils";
import { createTokenSchema, tokenNameSchema } from "@/lib/forms/profile";
import { api } from "@/plugins/api";
import type { AuthToken, User } from "@/plugins/api/interfaces";

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
  user: User | null;
  tokens: AuthToken[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  revoke: [token: AuthToken];
  "token-created": [];
}>();

const isOpen = useVModel(props, "modelValue", emit);

const showCreateForm = ref(false);
const creating = ref(false);
const tokenName = ref("");
const createdToken = ref("");

const sessionTokens = computed(() =>
  props.tokens.filter((token) => !token.is_long_lived),
);

const longLivedTokens = computed(() =>
  props.tokens.filter((token) => token.is_long_lived),
);

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};

const form = useForm({
  defaultValues: {
    tokenName: "",
  },
  validators: {
    onSubmit: createTokenSchema(t),
  },
  onSubmit: async () => {
    // Handled in handleCreateToken
  },
});

const isInvalid = (field: AnyFieldApi) => {
  return field.state.meta.errors.length > 0;
};

const canCreate = computed(() => {
  const name = tokenName.value || "";
  return name.trim().length > 0 && name.length <= 100 && !creating.value;
});

const handleCreateToken = async () => {
  if (!props.user || !canCreate.value) return;

  creating.value = true;

  try {
    const token = await api.createToken(tokenName.value, props.user.user_id);

    if (token) {
      createdToken.value = token;
      tokenName.value = "";
      showCreateForm.value = false;
      form.reset();
      emit("token-created");
      toast.success(t("auth.token_created"));
    } else {
      toast.error(t("auth.token_create_failed"));
    }
  } catch (error: unknown) {
    toast.error(
      error instanceof Error ? error.message : t("auth.token_create_failed"),
    );
  } finally {
    creating.value = false;
  }
};

const copyToken = async () => {
  if (!createdToken.value) return;
  const success = await copyToClipboard(createdToken.value);
  if (success) {
    toast.success(t("auth.token_copied"));
  } else {
    toast.error(t("auth.token_copy_failed"));
  }
};

const handleCloseCreateForm = () => {
  createdToken.value = "";
  tokenName.value = "";
  showCreateForm.value = false;
  form.reset();
};
</script>
