<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { handleImageError } from '@/utils/image'

export interface CarouselItem {
  id?: number
  image: string
  link?: string
  title?: string
}

/** 轻量轮播图（自实现，避免引入额外依赖） */
const props = withDefaults(
  defineProps<{
    items: CarouselItem[]
    interval?: number
    height?: string
  }>(),
  {
    interval: 4000,
    height: '320px',
  },
)

const emit = defineEmits<{
  select: [item: CarouselItem]
}>()

const current = ref(0)
let timer: number | null = null

const count = computed(() => props.items.length)

function go(index: number): void {
  if (count.value === 0) return
  current.value = (index + count.value) % count.value
}

function next(): void {
  go(current.value + 1)
}

function prev(): void {
  go(current.value - 1)
}

function select(item: CarouselItem): void {
  emit('select', item)
}

function start(): void {
  stop()
  if (count.value <= 1) return
  timer = window.setInterval(next, props.interval)
}

function stop(): void {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <div class="carousel" :style="{ height: props.height }">
    <div
      class="carousel__track"
      :style="{ transform: `translateX(-${current * 100}%)` }"
    >
      <div
        v-for="(item, index) in props.items"
        :key="item.id ?? index"
        class="carousel__slide"
        @click="select(item)"
      >
        <img :src="item.image" :alt="item.title ?? '轮播图'" @error="handleImageError" />
        <span v-if="item.title" class="carousel__caption">{{ item.title }}</span>
      </div>
    </div>

    <button type="button" class="carousel__arrow carousel__arrow--prev" aria-label="上一张" @click="prev">
      ‹
    </button>
    <button type="button" class="carousel__arrow carousel__arrow--next" aria-label="下一张" @click="next">
      ›
    </button>

    <div class="carousel__dots">
      <button
        v-for="(item, index) in props.items"
        :key="`dot-${item.id ?? index}`"
        type="button"
        class="carousel__dot"
        :class="{ 'carousel__dot--active': index === current }"
        :aria-label="`第 ${index + 1} 张`"
        @click="go(index)"
      />
    </div>
  </div>
</template>

<style scoped>
.carousel {
  position: relative;
  overflow: hidden;
  border-radius: var(--ss-radius-lg);
  background: var(--ss-color-bg-subtle);
}

.carousel__track {
  display: flex;
  height: 100%;
  transition: transform var(--ss-duration-slower) var(--ss-easing-standard);
}

.carousel__slide {
  position: relative;
  flex: 0 0 100%;
  height: 100%;
  cursor: pointer;
}

.carousel__slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel__caption {
  position: absolute;
  left: var(--ss-space-5);
  bottom: var(--ss-space-5);
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-pill);
  background: rgba(18, 27, 38, 0.55);
  color: var(--ss-color-text-inverse);
  font-size: var(--ss-font-size-lg);
  font-weight: var(--ss-font-weight-semibold);
}

.carousel__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--ss-radius-circle);
  background: rgba(255, 255, 255, 0.85);
  color: var(--ss-color-text-primary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--ss-duration-base) var(--ss-easing-standard);
}

.carousel:hover .carousel__arrow {
  opacity: 1;
}

.carousel__arrow--prev {
  left: var(--ss-space-3);
}

.carousel__arrow--next {
  right: var(--ss-space-3);
}

.carousel__dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--ss-space-3);
  display: flex;
  justify-content: center;
  gap: var(--ss-space-2);
}

.carousel__dot {
  width: 22px;
  height: 4px;
  border: 0;
  border-radius: var(--ss-radius-pill);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: background var(--ss-duration-base) var(--ss-easing-standard);
}

.carousel__dot--active {
  background: var(--ss-color-text-inverse);
}

@media (max-width: 767px) {
  .carousel__caption {
    left: var(--ss-space-3);
    bottom: var(--ss-space-6);
    font-size: var(--ss-font-size-base);
  }
}
</style>
