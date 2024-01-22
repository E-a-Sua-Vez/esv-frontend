<script>

import { globalStore } from './stores/index';
import Footer from './components/common/Footer.vue';
import Header from './components/common/Header.vue';
import DefaultSkeleton from './components/skeletons/DefaultSkeleton.vue';
import Offline from './components/common/Offline.vue';

export default {
  name: 'App',
  components: { Footer, Header, DefaultSkeleton, Offline },
  data() {
    const store = globalStore();
    return {
      store
    }
  },
  async onBeforeMount() {
    await this.store.resetSession;
  },
  methods: { }
}
</script>

<template>
  <div>
    <Suspense>
      <template #default>
        <Header></Header>
      </template>
    </Suspense>
    <RouterView v-slot="{ Component }">
      <Suspense timeout="0">
        <template #default>
          <div>
            <Offline :show="true"></Offline>
            <component :is="Component" :key="$route.path" class="container col-md-7"></component>
          </div>
        </template>
        <template #fallback>
          <DefaultSkeleton></DefaultSkeleton>
        </template>
      </Suspense>
    </RouterView>
    <Footer></Footer>
  </div>
</template>

<style src="@vueform/toggle/themes/default.css"></style>