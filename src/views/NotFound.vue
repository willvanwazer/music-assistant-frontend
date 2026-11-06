<template>
  <v-app>
    <v-main>
      <div class="not-found">
        <div class="content">
          <!-- a record with nothing on it, run out to the label -->
          <div class="vinyl-scene" aria-hidden="true">
            <div class="vinyl">
              <div
                v-for="i in 6"
                :key="i"
                class="groove"
                :style="`--i: ${i}`"
              ></div>
              <div class="label">
                <div class="label-hole"></div>
              </div>
            </div>
            <div class="needle-arm">
              <div class="needle-rod"></div>
              <div class="needle-head"></div>
            </div>
          </div>

          <h1 class="error-code">404</h1>
          <p class="headline">{{ $t("not_found_headline") }}</p>
          <p class="subtext">{{ $t("not_found_subtext") }}</p>

          <div class="actions">
            <Button
              variant="default"
              size="lg"
              @click="goBack(router, { name: 'discover' })"
            >
              <ArrowLeft class="size-4" />
              {{ $t("back") }}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              @click="router.push('/discover')"
            >
              <Compass class="size-4" />
              {{ $t("discover") }}
            </Button>
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { goBack } from "@/helpers/navigation";
import { ArrowLeft, Compass } from "@lucide/vue";
import { useRouter } from "vue-router";

defineOptions({ name: "NotFound" });

const router = useRouter();
</script>

<style scoped>
.not-found {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
  padding: 32px 24px;
  background: var(--background);
  color: var(--foreground);
}

.content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 460px;
  text-align: center;
}

/* a record is black in either theme; it is an object, not chrome */
.vinyl-scene {
  position: relative;
  width: 152px;
  height: 152px;
  margin-bottom: 28px;
}

.vinyl {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 152px;
  height: 152px;
  border-radius: 50%;
  background:
    radial-gradient(circle at center, transparent 20px, #111 21px),
    repeating-conic-gradient(#1c1c1c 0deg, #262626 1deg, #1c1c1c 2deg);
  box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.55);
}

.groove {
  --size: calc(36px + var(--i) * 17px);
  position: absolute;
  width: var(--size);
  height: var(--size);
  border: 1px solid rgba(255, 255, 255, 0.045);
  border-radius: 50%;
}

.label {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--primary);
}

.label-hole {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--background);
}

.needle-arm {
  position: absolute;
  top: -6px;
  right: -20px;
  transform-origin: top right;
}

.needle-rod {
  width: 3px;
  height: 70px;
  border-radius: 2px;
  background: var(--subtle-foreground);
  transform: rotate(28deg);
  transform-origin: top center;
}

.needle-head {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted-foreground);
  transform: translateX(-50%) rotate(28deg);
}

@media (prefers-reduced-motion: no-preference) {
  .vinyl {
    animation: vinyl-spin 4s linear infinite;
  }

  .needle-arm {
    animation: needle-sway 4s ease-in-out infinite;
  }
}

@keyframes vinyl-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes needle-sway {
  0%,
  100% {
    transform: rotate(-2deg);
  }
  50% {
    transform: rotate(2deg);
  }
}

/* big numerals and the headline name the page, in the display serif */
.error-code {
  margin: 0;
  color: var(--subtle-foreground);
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.14em;
  line-height: 1;
}

.headline {
  margin: 14px 0 0;
  font-family: var(--font-heading);
  font-size: clamp(2rem, 6vw, 2.75rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.08;
  text-wrap: balance;
}

.subtext {
  margin: 14px 0 0;
  max-width: 38ch;
  color: var(--muted-foreground);
  font-size: 0.9375rem;
  line-height: 1.5;
  text-wrap: pretty;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 28px;
}
</style>
