<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="user-dialog">
      <v-card-title class="user-dialog-title">
        {{ $t("auth.delete_user") }}
      </v-card-title>
      <v-card-text class="px-6 pb-2">
        <p class="user-dialog-text">
          {{ $t("auth.confirm_delete_user") }}
        </p>
        <div v-if="user" class="user-name-box">
          {{ user.display_name || user.username }}
        </div>
      </v-card-text>
      <v-card-actions class="pa-6 pt-4">
        <v-spacer />
        <v-btn
          variant="flat"
          class="user-dialog-btn user-dialog-cancel"
          @click="emit('update:modelValue', false)"
        >
          {{ $t("cancel") }}
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          class="user-dialog-btn"
          :loading="loading"
          @click="handleDelete"
        >
          {{ $t("auth.delete_user") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { api } from "@/plugins/api";
import type { User } from "@/plugins/api/interfaces";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  deleted: [];
}>();

const loading = ref(false);

const handleDelete = async () => {
  if (!props.user) return;

  loading.value = true;

  try {
    const success = await api.deleteUser(props.user.user_id);
    if (success) {
      toast.success(t("auth.user_deleted"));
      emit("deleted");
      emit("update:modelValue", false);
    } else {
      toast.error(t("auth.user_delete_failed"));
    }
  } catch (error) {
    toast.error(t("auth.user_delete_failed"));
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.user-dialog {
  border-radius: 20px !important;
  background: var(--popover) !important;
  color: var(--popover-foreground) !important;
  border: 1px solid var(--border);
}

.user-dialog-title {
  padding: 24px 24px 0;
  font-family: var(--font-heading);
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.25;
  white-space: normal;
}

.user-dialog-text {
  margin: 8px 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted-foreground);
}

.user-name-box {
  background: color-mix(in oklab, var(--destructive) 10%, transparent);
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 0.875rem;
}

.user-dialog-btn {
  height: 36px !important;
  padding: 0 16px !important;
  border-radius: 999px !important;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.user-dialog-cancel {
  background: var(--secondary) !important;
  color: var(--secondary-foreground) !important;
}
</style>
