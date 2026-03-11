export default {
  editor: {
    label: { en: 'Member Favourites' },
    icon: 'heart',
    categories: ['account', 'ecommerce'],
  },
  properties: {
    supabaseUrl: {
      label: { en: 'Supabase URL' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    supabaseAnonKey: {
      label: { en: 'Supabase Anon Key' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    accessToken: {
      label: { en: 'Auth Access Token' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    isMember: {
      label: { en: 'Is Member' },
      type: 'OnOff',
      bindable: true,
      defaultValue: false,
    },
    householdId: {
      label: { en: 'Household ID' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
  },
  triggerEvents: [
    {
      name: 'favorites:added',
      label: { en: 'On Favourite Added' },
      event: { productId: '', productName: '' },
    },
    {
      name: 'favorites:removed',
      label: { en: 'On Favourite Removed' },
      event: { productId: '', productName: '' },
    },
    {
      name: 'favorites:error',
      label: { en: 'On Favourite Error' },
      event: { productId: '', message: '' },
    },
    {
      name: 'cart:item-added',
      label: { en: 'On Add to Cart' },
      event: { productId: '', productName: '' },
    },
    {
      name: 'cart:add-error',
      label: { en: 'On Add to Cart Error' },
      event: { productId: '', message: '' },
    },
  ],
};
