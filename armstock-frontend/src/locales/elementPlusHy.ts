import hyAm from 'element-plus/es/locale/lang/hy-am';

/** Element Plus's Armenian pack, with our fixes to its texts. */
export default {
  ...hyAm,
  el: {
    ...hyAm.el,
    colorpicker: {
      ...hyAm.el.colorpicker,
      confirm: 'Լավ',
    },
    datepicker: {
      ...hyAm.el.datepicker,
      confirm: 'Լավ',
    },
    select: {
      ...hyAm.el.select,
      noMatch: 'Համընկնող տվյալներ չեն գտնվել',
    },
  },
};
