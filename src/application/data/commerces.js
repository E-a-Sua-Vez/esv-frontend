export default [
  {
    id: 'fHfcph6mcVJF3Ki1',
    name: "Notaria Camille & Matthwe's",
    active: true,
    logo: '/images/fake_commerce_notary_logo.png',
    queues: [
      {
        id: 1,
        name: 'Atención Regular',
        position: 1,
        active: true,
        limit: 200,
      },
      {
        id: 2,
        name: 'Atención 3era Edad',
        position: 3,
        active: true,
        limit: 200,
      },
      {
        id: 3,
        name: 'Atención Embarazadas',
        position: 2,
        active: true,
        limit: 200,
      },
      {
        id: 4,
        name: 'Atención Premium',
        position: 4,
        active: false,
        limit: 200,
      },
    ],
  },
  {
    id: 'oVxVYWaHVbJVCJzp',
    name: 'Insert Coin Restaurant',
    active: true,
    logo: '/images/fake_commerce_restaurant_logo.png',
    queues: [],
  },
  {
    id: 'S9QRm3pRbvVpspwy',
    name: 'El Taller del Chocolate (Providencia)',
    active: true,
    logo: '/images/fake_commerce_custom_logo.png',
    queues: [
      {
        id: 1,
        name: 'Ventanilla Única',
        position: 1,
        active: true,
        limit: 200,
      },
    ],
  },
  {
    id: 'cZzaBfMrPkL7GDJy',
    name: 'El Taller del Chocolate (Ñuñoa)',
    active: false,
    logo: '/images/fake_commerce_custom_logo.png',
    queues: [
      {
        id: 1,
        name: 'Ventanilla Única',
        position: 1,
        active: true,
        limit: 200,
      },
    ],
  },
  {
    id: 'WcKFxH2BxeV16ZHCCV6N',
    name: "Nina's Beauty",
    active: true,
    logo: '/images/ninas_beauty_logo.png',
    queues: [],
  },
];
