<template>
  <div>
    <div  class="content">
      <div id="skel-logo" class="content-image img-fluid mx-auto"></div>
      <div id="skel-page-header" class="content-info">
        <span></span>
        <h3></h3>
      </div>
      <div id="skel-queues" class="content-queues">
      </div>
    </div>
  </div>
</template>
<style scoped>
.content {
  padding: 2rem 6rem;
}
.content-image {
  display: flex;
  height: 150px;
  margin: .5rem;
  background-size: 100%;
  border-radius: 10px;
  animation: pulse-bg 1s infinite;
}
.content-info span {
  width: 100%;
  height: 16px;
  display: block;
  margin: .5rem 0 .5rem 0;
  border-radius: 10px;
  animation: pulse-bg 1s infinite;
}
.content-info h3 {
  height: 24px;
  border-radius: 10px;
  animation: pulse-bg 1s infinite;
}
.content-queues {
  width: 100%;
  padding-top: 100%;
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