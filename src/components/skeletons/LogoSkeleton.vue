<template>
  <div>
    <div class="content">
      <div id="logo" class="content-image img-fluid mx-auto"></div>
    </div>
  </div>
</template>
<style scoped>
.content {
  padding: 2rem;
}
.content-image {
  display: flex;
  height: 100px;
  margin: 0rem;
  background-size: 100%;
  border-radius: 10px;
  animation: pulse-bg 1s infinite;
}
@keyframes pulse-bg {
  0% {
    background-color: #eeeeee;
  }
  50% {
    background-color: #d5d4d4;
  }
  100% {
    background-color: #eeeeee;
  }
}
</style>
