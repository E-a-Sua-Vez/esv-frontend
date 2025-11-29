<script>
import { globalStore } from '@/stores/index';
import Footer from '@/components/common/Footer.vue';
import Header from '@/components/common/Header.vue';
import DefaultSkeleton from '@/components/skeletons/DefaultSkeleton.vue';
import Offline from '@/components/common/Offline.vue';

export default {
  name: 'App',
  components: { Footer, Header, DefaultSkeleton, Offline },
  data() {
    const store = globalStore();
    return {
      store,
    };
  },
  async onBeforeMount() {
    await this.store.resetSession();
  },
  methods: {},
};
</script>

<template>
  <div>
    <Suspense>
      <template #default>
        <Header></Header>
      </template>
      <template #fallback>
        <div
          style="
            height: 75px;
            background: rgba(31, 63, 146, 0.98);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1030;
          "
        ></div>
      </template>
    </Suspense>
    <RouterView v-slot="{ Component }">
      <template v-if="Component">
        <Transition mode="out-in">
          <KeepAlive>
            <Suspense>
              <template #default>
                <div class="main-content-wrapper">
                  <Offline :show="true"></Offline>
                  <component
                    :is="Component"
                    :key="$route.path"
                    class="main-content-container"
                  ></component>
                  <Footer></Footer>
                </div>
              </template>
              <template #fallback>
                <DefaultSkeleton></DefaultSkeleton>
              </template>
            </Suspense>
          </KeepAlive>
        </Transition>
      </template>
      <template v-else>
        <DefaultSkeleton></DefaultSkeleton>
      </template>
    </RouterView>
  </div>
</template>

<style src="@vueform/toggle/themes/default.css"></style>
