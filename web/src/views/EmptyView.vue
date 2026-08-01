<template>
  <div class="not-found">
    <h1>404 - 페이지를 찾을 수 없습니다</h1>
    <p>요청한 페이지가 없거나 아직 준비되지 않았습니다.</p>
  </div>
</template>

<script setup></script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  text-align: center;
}

.not-found h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.not-found p {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}
</style>
