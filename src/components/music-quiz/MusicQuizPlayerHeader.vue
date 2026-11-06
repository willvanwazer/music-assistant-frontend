<template>
  <Card class="gap-3 py-4">
    <CardContent class="flex flex-col gap-3 px-4">
      <div class="flex items-center gap-3">
        <MusicQuizAvatar
          :name="playerName"
          class="size-11 shrink-0 text-base"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h1 class="ma-display truncate pb-0.5 text-xl leading-tight">
              {{ playerName }}
            </h1>
            <Badge v-if="rank" class="shrink-0 tabular-nums">#{{ rank }}</Badge>
          </div>
        </div>
        <span class="flex shrink-0 items-baseline gap-1.5 tabular-nums">
          <span
            class="font-display text-3xl leading-none font-medium lining-nums"
          >
            {{ score }}
          </span>
          <span
            v-if="scoreDelta"
            class="text-primary text-sm leading-none font-semibold"
          >
            {{ scoreDelta }}
          </span>
        </span>
      </div>

      <div
        v-if="roundResults?.length"
        class="flex flex-wrap items-center justify-center gap-2"
        role="status"
      >
        <span
          v-for="result in roundResults"
          :key="result.key"
          data-testid="player-round-result"
          class="flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums"
          :class="
            result.correct
              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 text-destructive'
          "
        >
          <CircleCheck
            v-if="result.correct"
            class="size-4"
            aria-hidden="true"
          />
          <CircleX v-else class="size-4" aria-hidden="true" />
          <span class="sr-only">
            {{
              $t(
                result.correct
                  ? "providers.music_quiz.correct"
                  : "providers.music_quiz.incorrect",
              )
            }}
          </span>
          {{ result.label }}
          <span>+{{ result.points }}</span>
        </span>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import MusicQuizAvatar from "@/components/music-quiz/MusicQuizAvatar.vue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { $t } from "@/plugins/i18n";
import { CircleCheck, CircleX } from "@lucide/vue";

export interface MusicQuizRoundResult {
  key: string;
  label: string;
  correct: boolean;
  points: number;
}

defineProps<{
  playerName: string;
  rank: number | null;
  score: number;
  scoreDelta: string;
  roundResults?: MusicQuizRoundResult[];
}>();
</script>
