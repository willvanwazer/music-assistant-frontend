<template>
  <Card>
    <CardContent
      class="flex min-h-40 flex-col items-center justify-center gap-5 text-center sm:min-h-52"
      :class="{ 'lg:min-h-72': present }"
    >
      <p
        class="ma-display max-w-4xl text-2xl leading-snug text-balance sm:text-3xl"
        :class="{ 'lg:text-5xl lg:leading-tight': present }"
        data-testid="trivia-question"
      >
        {{ round.question }}
      </p>
      <div
        v-if="round.answer_label"
        class="border-primary/30 bg-primary/10 flex max-w-3xl flex-col gap-1.5 rounded-[14px] border px-5 py-3"
      >
        <span
          class="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase"
        >
          {{ $t("providers.music_quiz.answer_was") }}
        </span>
        <strong
          class="font-display text-primary text-2xl leading-tight font-medium sm:text-3xl"
          :class="{ 'lg:text-4xl': present }"
          data-testid="trivia-answer"
        >
          {{ round.answer_label }}
        </strong>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent } from "@/components/ui/card";
import type { MusicQuizTriviaRound } from "@/composables/music-quiz/useMusicQuiz";
import { $t } from "@/plugins/i18n";

withDefaults(
  defineProps<{
    round: MusicQuizTriviaRound;
    present?: boolean;
  }>(),
  {
    present: false,
  },
);
</script>
