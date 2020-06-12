import isPlainObject from 'lodash/isPlainObject';
import classNames from 'classnames';
import { isVNode } from 'vue';
import { camelize, hyphenate, isOn, resolvePropValue } from './util';
// function getType(fn) {
//   const match = fn && fn.toString().match(/^\s*function (\w+)/);
//   return match ? match[1] : '';
// }

const splitAttrs = attrs => {
  const allAttrs = Object.keys(attrs);
  const eventAttrs = {};
  const onEvents = {};
  const extraAttrs = {};
  for (let i = 0, l = allAttrs.length; i < l; i++) {
    const key = allAttrs[i];
    if (isOn(key)) {
      eventAttrs[key[2].toLowerCase() + key.slice(3)] = attrs[key];
      onEvents[key] = attrs[key];
    } else {
      extraAttrs[key] = attrs[key];
    }
  }
  return { onEvents, events: eventAttrs, extraAttrs };
};
const parseStyleText = (cssText = '', camel) => {
  const res = {};
  const listDelimiter = /;(?![^(]*\))/g;
  const propertyDelimiter = /:(.+)/;
  cssText.split(listDelimiter).forEach(function(item) {
    if (item) {
      const tmp = item.split(propertyDelimiter);
      if (tmp.length > 1) {
        const k = camel ? camelize(tmp[0].trim()) : tmp[0].trim();
        res[k] = tmp[1].trim();
      }
    }
  });
  return res;
};

const hasProp = (instance, prop) => {
  return prop in getOptionProps(instance);
};
// 重构后直接使用 hasProp 替换
const slotHasProp = (slot, prop) => {
  return hasProp(slot, prop);
};

const getScopedSlots = ele => {
  return (ele.data && ele.data.scopedSlots) || {};
};

const getSlots = ele => {
  let componentOptions = ele.componentOptions || {};
  if (ele.$vnode) {
    componentOptions = ele.$vnode.componentOptions || {};
  }
  const children = ele.children || componentOptions.children || [];
  const slots = {};
  children.forEach(child => {
    if (!isEmptyElement(child)) {
      const name = (child.data && child.data.slot) || 'default';
      slots[name] = slots[name] || [];
      slots[name].push(child);
    }
  });
  return { ...slots, ...getScopedSlots(ele) };
};
const getSlot = (self, name = 'default', options = {}) => {
  return self.$slots[name] && self.$slots[name](options);
};

const getAllChildren = ele => {
  let componentOptions = ele.componentOptions || {};
  if (ele.$vnode) {
    componentOptions = ele.$vnode.componentOptions || {};
  }
  return ele.children || componentOptions.children || [];
};
const getSlotOptions = ele => {
  if (ele.fnOptions) {
    // 函数式组件
    return ele.fnOptions;
  }
  let componentOptions = ele.componentOptions;
  if (ele.$vnode) {
    componentOptions = ele.$vnode.componentOptions;
  }
  return componentOptions ? componentOptions.Ctor.options || {} : {};
};
const getOptionProps = instance => {
  const res = {};
  if (instance.$ && instance.$.vnode) {
    const props = instance.$.vnode.props || {};
    Object.keys(instance.$props).forEach(k => {
      const v = instance.$props[k];
      const hyphenateKey = hyphenate(k);
      if (v !== undefined || hyphenateKey in props) {
        res[k] = v; // 直接取 $props[k]
      }
    });
  } else if (isVNode(instance) && typeof instance.type === 'object') {
    const props = instance.props || {};
    const options = instance.type.props;
    Object.keys(options).forEach(k => {
      const hyphenateKey = hyphenate(k);
      const v = resolvePropValue(options, props, k, props[hyphenateKey], hyphenateKey);
      if (v !== undefined || hyphenateKey in props) {
        res[k] = v;
      }
    });
  }
  return res;
};
const getComponent = (instance, prop, options = instance, execute = true) => {
  const temp = instance[prop];
  if (temp !== undefined) {
    return typeof temp === 'function' && execute ? temp(options) : temp;
  } else {
    let com = instance.$slots[prop];
    com = execute && com ? com(options) : com;
    return Array.isArray(com) && com.length === 1 ? com[0] : com;
  }
};
const getComponentFromProp = (instance, prop, options = instance, execute = true) => {
  if (instance.$createElement) {
    const h = instance.$createElement;
    const temp = instance[prop];
    if (temp !== undefined) {
      return typeof temp === 'function' && execute ? temp(h, options) : temp;
    }
    return (
      (instance.$scopedSlots[prop] && execute && instance.$scopedSlots[prop](options)) ||
      instance.$scopedSlots[prop] ||
      instance.$slots[prop] ||
      undefined
    );
  } else {
    const h = instance.context.$createElement;
    const temp = getPropsData(instance)[prop];
    if (temp !== undefined) {
      return typeof temp === 'function' && execute ? temp(h, options) : temp;
    }
    const slotScope = getScopedSlots(instance)[prop];
    if (slotScope !== undefined) {
      return typeof slotScope === 'function' && execute ? slotScope(h, options) : slotScope;
    }
    const slotsProp = [];
    const componentOptions = instance.componentOptions || {};
    (componentOptions.children || []).forEach(child => {
      if (child.data && child.data.slot === prop) {
        if (child.data.attrs) {
          delete child.data.attrs.slot;
        }
        if (child.tag === 'template') {
          slotsProp.push(child.children);
        } else {
          slotsProp.push(child);
        }
      }
    });
    return slotsProp.length ? slotsProp : undefined;
  }
};

const getAllProps = ele => {
  let data = ele.data || {};
  let componentOptions = ele.componentOptions || {};
  if (ele.$vnode) {
    data = ele.$vnode.data || {};
    componentOptions = ele.$vnode.componentOptions || {};
  }
  return { ...data.props, ...data.attrs, ...componentOptions.propsData };
};

// 使用 getOptionProps 替换 ，待测试
const getPropsData = ele => {
  return getOptionProps(ele);
  //return ele.props || {};
};
const getValueByProp = (ele, prop) => {
  return getPropsData(ele)[prop];
};

const getAttrs = ele => {
  let data = ele.data;
  if (ele.$vnode) {
    data = ele.$vnode.data;
  }
  return data ? data.attrs || {} : {};
};

const getKey = ele => {
  let key = ele.key;
  if (ele.$vnode) {
    key = ele.$vnode.key;
  }
  return key;
};

export function getEvents(child) {
  const { $attrs } = child;
  return splitAttrs($attrs).events;

  // let events = {};
  // if (child.componentOptions && child.componentOptions.listeners) {
  //   events = child.componentOptions.listeners;
  // } else if (child.data && child.data.on) {
  //   events = child.data.on;
  // }
  // return { ...events };
}
export function getEvent(child, event) {
  return child.props && child.props[event];
}

// 获取 xxx.native 或者 原生标签 事件
export function getDataEvents(child) {
  let events = {};
  if (child.data && child.data.on) {
    events = child.data.on;
  }
  return { ...events };
}

// use getListeners instead this.$listeners
// https://github.com/vueComponent/ant-design-vue/issues/1705
export function getListeners(context) {
  return (context.$vnode ? context.$vnode.componentOptions.listeners : context.$listeners) || {};
}
export function getClass(ele) {
  const props = (isVNode(ele) ? ele.props : ele.$attrs) || {};
  let tempCls = props.class || {};
  let cls = {};
  if (typeof tempCls === 'string') {
    tempCls.split(' ').forEach(c => {
      cls[c.trim()] = true;
    });
  } else if (Array.isArray(tempCls)) {
    classNames(tempCls)
      .split(' ')
      .forEach(c => {
        cls[c.trim()] = true;
      });
  } else {
    cls = { ...cls, ...tempCls };
  }
  return cls;
}
export function getStyle(ele, camel) {
  const props = (isVNode(ele) ? ele.props : ele.$attrs) || {};
  let style = props.style || {};
  if (typeof style === 'string') {
    style = parseStyleText(style, camel);
  } else if (camel && style) {
    // 驼峰化
    const res = {};
    Object.keys(style).forEach(k => (res[camelize(k)] = style[k]));
    return res;
  }
  return style;
}

export function getComponentName(opts) {
  return opts && (opts.Ctor.options.name || opts.tag);
}

export function isEmptyElement(c) {
  return typeof c.type.toString() === 'Symbol(Text)' && c.children.trim() === '';
}

export function isStringElement(c) {
  return !c.tag;
}

export function filterEmpty(children = []) {
  return children.filter(c => !isEmptyElement(c));
}
const initDefaultProps = (propTypes, defaultProps) => {
  Object.keys(defaultProps).forEach(k => {
    if (propTypes[k]) {
      propTypes[k].def && (propTypes[k] = propTypes[k].def(defaultProps[k]));
    } else {
      throw new Error(`not have ${k} prop`);
    }
  });
  return propTypes;
};

export function mergeProps() {
  const args = [].slice.call(arguments, 0);
  const props = {};
  args.forEach((p = {}) => {
    for (const [k, v] of Object.entries(p)) {
      props[k] = props[k] || {};
      if (isPlainObject(v)) {
        Object.assign(props[k], v);
      } else {
        props[k] = v;
      }
    }
  });
  return props;
}

function isValidElement(element) {
  return element && element.__v_isVNode && typeof element.type !== 'symbol'; // remove text node
}

export {
  splitAttrs,
  hasProp,
  getOptionProps,
  getComponent,
  getComponentFromProp,
  getSlotOptions,
  slotHasProp,
  getPropsData,
  getKey,
  getAttrs,
  getValueByProp,
  parseStyleText,
  initDefaultProps,
  isValidElement,
  camelize,
  getSlots,
  getSlot,
  getAllProps,
  getAllChildren,
};
export default hasProp;
