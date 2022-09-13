
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function () {
    'use strict';

    const currentVersion = '0.0.7';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        };
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    var NetworkState;
    (function (NetworkState) {
        NetworkState[NetworkState["Loading"] = 0] = "Loading";
        NetworkState[NetworkState["Success"] = 1] = "Success";
        NetworkState[NetworkState["Error"] = 2] = "Error";
    })(NetworkState || (NetworkState = {}));

    const anyObject = {};

    class BaseApiService {
        constructor(newBaseUrl) {
            var _a, _b;
            this._baseUrl = (_b = (_a = window.config) === null || _a === void 0 ? void 0 : _a.apiUrl) !== null && _b !== void 0 ? _b : 'https://api.assistantapps.com';
            if (newBaseUrl != null)
                this._baseUrl = newBaseUrl;
        }
        async get(url) {
            try {
                const result = await fetch(`${this._baseUrl}/${url}`);
                const content = await result.json();
                return {
                    isSuccess: true,
                    value: content,
                    errorMessage: ''
                };
            }
            catch (ex) {
                return {
                    isSuccess: false,
                    value: anyObject,
                    errorMessage: ex.message
                };
            }
        }
        async post(url, payload, customMapper) {
            try {
                const result = await fetch(`${this._baseUrl}/${url}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                });
                const content = await result.json();
                if (customMapper != null)
                    return customMapper(content);
                return {
                    isSuccess: true,
                    value: content,
                    errorMessage: ''
                };
            }
            catch (ex) {
                return {
                    isSuccess: false,
                    value: anyObject,
                    errorMessage: ex.message
                };
            }
        }
    }

    class AssistantNmsApiService extends BaseApiService {
        constructor() {
            var _a, _b;
            super((_b = (_a = window.config) === null || _a === void 0 ? void 0 : _a.apiUrl) !== null && _b !== void 0 ? _b : 'https://api.nmsassistant.com');
            this.getItemInfoAppId = (appId, languageCode) => this.get(`ItemInfo/${appId}/${languageCode !== null && languageCode !== void 0 ? languageCode : 'en'}`);
            this.getItemInfoGameId = (gameId, languageCode) => this.get(`ItemInfo/GameId/${gameId}/${languageCode !== null && languageCode !== void 0 ? languageCode : 'en'}`);
            this.getCommunityMission = () => this.get('HelloGames/CommunityMission/');
            this.getCurrentExpedition = () => this.get('HelloGames/Expedition/');
        }
    }

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\module\helloGames\communityMissionTile.svelte generated by Svelte v3.48.0 */

    const { Object: Object_1$2 } = globals;
    const file$a = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\module\\helloGames\\communityMissionTile.svelte";

    // (26:2) {#if networkState == NetworkState.Loading}
    function create_if_block_2$3(ctx) {
    	let slot;
    	let assistant_nms_tile_loading;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			assistant_nms_tile_loading = element("assistant-nms-tile-loading");
    			add_location(assistant_nms_tile_loading, file$a, 27, 6, 1025);
    			attr_dev(slot, "name", "loading");
    			add_location(slot, file$a, 26, 4, 996);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    			append_dev(slot, assistant_nms_tile_loading);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(26:2) {#if networkState == NetworkState.Loading}",
    		ctx
    	});

    	return block;
    }

    // (31:2) {#if networkState == NetworkState.Error}
    function create_if_block_1$4(ctx) {
    	let slot;
    	let assistant_nms_common_tile;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			assistant_nms_common_tile = element("assistant-nms-common-tile");
    			set_custom_element_data(assistant_nms_common_tile, "imageurl", "https://app.nmsassistant.com/assets/images/error.png");
    			set_custom_element_data(assistant_nms_common_tile, "name", "Something went wrong");
    			add_location(assistant_nms_common_tile, file$a, 32, 6, 1154);
    			attr_dev(slot, "name", "error");
    			add_location(slot, file$a, 31, 4, 1127);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    			append_dev(slot, assistant_nms_common_tile);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(31:2) {#if networkState == NetworkState.Error}",
    		ctx
    	});

    	return block;
    }

    // (39:2) {#if networkState == NetworkState.Success}
    function create_if_block$5(ctx) {
    	let assistant_nms_common_tile;
    	let div1;
    	let div0;
    	let div0_style_value;
    	let t0;
    	let span;
    	let t1_value = `${/*communityMission*/ ctx[1].percentage}%` + "";
    	let t1;
    	let assistant_nms_common_tile_name_value;

    	const block = {
    		c: function create() {
    			assistant_nms_common_tile = element("assistant-nms-common-tile");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(div0, "class", "progress");
    			attr_dev(div0, "style", div0_style_value = `width: ${/*communityMission*/ ctx[1].percentage}%;`);
    			add_location(div0, file$a, 46, 8, 1767);
    			add_location(span, file$a, 50, 8, 1882);
    			attr_dev(div1, "slot", "subtitle");
    			attr_dev(div1, "class", "progressbar");
    			add_location(div1, file$a, 45, 6, 1716);
    			set_custom_element_data(assistant_nms_common_tile, "imageurl", "https://app.nmsassistant.com/assets/images/special/communityMissionProgress.png");
    			set_custom_element_data(assistant_nms_common_tile, "name", assistant_nms_common_tile_name_value = `Research Progress - Tier ${/*communityMission*/ ctx[1].currentTier} / ${/*communityMission*/ ctx[1].totalTiers}`);
    			set_custom_element_data(assistant_nms_common_tile, "url", "https://app.nmsassistant.com/helloGames/communityMission");
    			set_custom_element_data(assistant_nms_common_tile, "showsubtitle", true);
    			add_location(assistant_nms_common_tile, file$a, 39, 4, 1374);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, assistant_nms_common_tile, anchor);
    			append_dev(assistant_nms_common_tile, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, span);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*communityMission*/ 2 && div0_style_value !== (div0_style_value = `width: ${/*communityMission*/ ctx[1].percentage}%;`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (dirty & /*communityMission*/ 2 && t1_value !== (t1_value = `${/*communityMission*/ ctx[1].percentage}%` + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*communityMission*/ 2 && assistant_nms_common_tile_name_value !== (assistant_nms_common_tile_name_value = `Research Progress - Tier ${/*communityMission*/ ctx[1].currentTier} / ${/*communityMission*/ ctx[1].totalTiers}`)) {
    				set_custom_element_data(assistant_nms_common_tile, "name", assistant_nms_common_tile_name_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(assistant_nms_common_tile);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(39:2) {#if networkState == NetworkState.Success}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block0 = /*networkState*/ ctx[0] == NetworkState.Loading && create_if_block_2$3(ctx);
    	let if_block1 = /*networkState*/ ctx[0] == NetworkState.Error && create_if_block_1$4(ctx);
    	let if_block2 = /*networkState*/ ctx[0] == NetworkState.Success && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			this.c = noop;
    			attr_dev(div, "class", "default-tile noselect");
    			add_location(div, file$a, 24, 0, 909);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*networkState*/ ctx[0] == NetworkState.Loading) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2$3(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*networkState*/ ctx[0] == NetworkState.Error) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$4(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*networkState*/ ctx[0] == NetworkState.Success) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$5(ctx);
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-community-mission-tile', slots, []);
    	let networkState = NetworkState.Loading;
    	let communityMission = anyObject;

    	const fetchCommunityMission = async () => {
    		const anmsApi = new AssistantNmsApiService();
    		let commMissionResult = await anmsApi.getCommunityMission();

    		if (commMissionResult.isSuccess == false || commMissionResult.value == null) {
    			$$invalidate(0, networkState = NetworkState.Error);
    			return;
    		}

    		$$invalidate(1, communityMission = Object.assign({}, commMissionResult.value));
    		$$invalidate(0, networkState = NetworkState.Success);
    	};

    	onMount(async () => {
    		fetchCommunityMission();
    	});

    	const writable_props = [];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-community-mission-tile> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		NetworkState,
    		AssistantNmsApiService,
    		anyObject,
    		networkState,
    		communityMission,
    		fetchCommunityMission
    	});

    	$$self.$inject_state = $$props => {
    		if ('networkState' in $$props) $$invalidate(0, networkState = $$props.networkState);
    		if ('communityMission' in $$props) $$invalidate(1, communityMission = $$props.communityMission);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [networkState, communityMission];
    }

    class CommunityMissionTile extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.default-tile{--assistantnms-img-size:75px}.progressbar{position:relative;background:#000;width:100%;height:20px;border-radius:5px}.progressbar span{position:absolute;top:0;left:50%;font-size:16px;font-weight:bold;transform:translateX(-50%);mix-blend-mode:difference}.progress{height:20px;border-radius:5px;background:var(--assistantnms-progress-bar-end-colour, #e0c83f);background:linear-gradient(
      to right,
      var(--assistantnms-progress-bar-start-colour, #f47c34),
      var(--assistantnms-progress-bar-end-colour, #e0c83f)
    );transition:600ms cubic-bezier(0.6, 0, 0.38, 1)}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$a,
    			create_fragment$a,
    			safe_not_equal,
    			{},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("assistant-nms-community-mission-tile", CommunityMissionTile);

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var dayjs_min = createCommonjsModule(function (module, exports) {
    !function(t,e){module.exports=e();}(commonjsGlobal,(function(){var t=1e3,e=6e4,n=36e5,r="millisecond",i="second",s="minute",u="hour",a="day",o="week",f="month",h="quarter",c="year",d="date",$="Invalid Date",l=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,y=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,M={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_")},m=function(t,e,n){var r=String(t);return !r||r.length>=e?t:""+Array(e+1-r.length).join(n)+t},g={s:m,z:function(t){var e=-t.utcOffset(),n=Math.abs(e),r=Math.floor(n/60),i=n%60;return (e<=0?"+":"-")+m(r,2,"0")+":"+m(i,2,"0")},m:function t(e,n){if(e.date()<n.date())return -t(n,e);var r=12*(n.year()-e.year())+(n.month()-e.month()),i=e.clone().add(r,f),s=n-i<0,u=e.clone().add(r+(s?-1:1),f);return +(-(r+(n-i)/(s?i-u:u-i))||0)},a:function(t){return t<0?Math.ceil(t)||0:Math.floor(t)},p:function(t){return {M:f,y:c,w:o,d:a,D:d,h:u,m:s,s:i,ms:r,Q:h}[t]||String(t||"").toLowerCase().replace(/s$/,"")},u:function(t){return void 0===t}},v="en",D={};D[v]=M;var p=function(t){return t instanceof _},S=function t(e,n,r){var i;if(!e)return v;if("string"==typeof e){var s=e.toLowerCase();D[s]&&(i=s),n&&(D[s]=n,i=s);var u=e.split("-");if(!i&&u.length>1)return t(u[0])}else {var a=e.name;D[a]=e,i=a;}return !r&&i&&(v=i),i||!r&&v},w=function(t,e){if(p(t))return t.clone();var n="object"==typeof e?e:{};return n.date=t,n.args=arguments,new _(n)},O=g;O.l=S,O.i=p,O.w=function(t,e){return w(t,{locale:e.$L,utc:e.$u,x:e.$x,$offset:e.$offset})};var _=function(){function M(t){this.$L=S(t.locale,null,!0),this.parse(t);}var m=M.prototype;return m.parse=function(t){this.$d=function(t){var e=t.date,n=t.utc;if(null===e)return new Date(NaN);if(O.u(e))return new Date;if(e instanceof Date)return new Date(e);if("string"==typeof e&&!/Z$/i.test(e)){var r=e.match(l);if(r){var i=r[2]-1||0,s=(r[7]||"0").substring(0,3);return n?new Date(Date.UTC(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)):new Date(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)}}return new Date(e)}(t),this.$x=t.x||{},this.init();},m.init=function(){var t=this.$d;this.$y=t.getFullYear(),this.$M=t.getMonth(),this.$D=t.getDate(),this.$W=t.getDay(),this.$H=t.getHours(),this.$m=t.getMinutes(),this.$s=t.getSeconds(),this.$ms=t.getMilliseconds();},m.$utils=function(){return O},m.isValid=function(){return !(this.$d.toString()===$)},m.isSame=function(t,e){var n=w(t);return this.startOf(e)<=n&&n<=this.endOf(e)},m.isAfter=function(t,e){return w(t)<this.startOf(e)},m.isBefore=function(t,e){return this.endOf(e)<w(t)},m.$g=function(t,e,n){return O.u(t)?this[e]:this.set(n,t)},m.unix=function(){return Math.floor(this.valueOf()/1e3)},m.valueOf=function(){return this.$d.getTime()},m.startOf=function(t,e){var n=this,r=!!O.u(e)||e,h=O.p(t),$=function(t,e){var i=O.w(n.$u?Date.UTC(n.$y,e,t):new Date(n.$y,e,t),n);return r?i:i.endOf(a)},l=function(t,e){return O.w(n.toDate()[t].apply(n.toDate("s"),(r?[0,0,0,0]:[23,59,59,999]).slice(e)),n)},y=this.$W,M=this.$M,m=this.$D,g="set"+(this.$u?"UTC":"");switch(h){case c:return r?$(1,0):$(31,11);case f:return r?$(1,M):$(0,M+1);case o:var v=this.$locale().weekStart||0,D=(y<v?y+7:y)-v;return $(r?m-D:m+(6-D),M);case a:case d:return l(g+"Hours",0);case u:return l(g+"Minutes",1);case s:return l(g+"Seconds",2);case i:return l(g+"Milliseconds",3);default:return this.clone()}},m.endOf=function(t){return this.startOf(t,!1)},m.$set=function(t,e){var n,o=O.p(t),h="set"+(this.$u?"UTC":""),$=(n={},n[a]=h+"Date",n[d]=h+"Date",n[f]=h+"Month",n[c]=h+"FullYear",n[u]=h+"Hours",n[s]=h+"Minutes",n[i]=h+"Seconds",n[r]=h+"Milliseconds",n)[o],l=o===a?this.$D+(e-this.$W):e;if(o===f||o===c){var y=this.clone().set(d,1);y.$d[$](l),y.init(),this.$d=y.set(d,Math.min(this.$D,y.daysInMonth())).$d;}else $&&this.$d[$](l);return this.init(),this},m.set=function(t,e){return this.clone().$set(t,e)},m.get=function(t){return this[O.p(t)]()},m.add=function(r,h){var d,$=this;r=Number(r);var l=O.p(h),y=function(t){var e=w($);return O.w(e.date(e.date()+Math.round(t*r)),$)};if(l===f)return this.set(f,this.$M+r);if(l===c)return this.set(c,this.$y+r);if(l===a)return y(1);if(l===o)return y(7);var M=(d={},d[s]=e,d[u]=n,d[i]=t,d)[l]||1,m=this.$d.getTime()+r*M;return O.w(m,this)},m.subtract=function(t,e){return this.add(-1*t,e)},m.format=function(t){var e=this,n=this.$locale();if(!this.isValid())return n.invalidDate||$;var r=t||"YYYY-MM-DDTHH:mm:ssZ",i=O.z(this),s=this.$H,u=this.$m,a=this.$M,o=n.weekdays,f=n.months,h=function(t,n,i,s){return t&&(t[n]||t(e,r))||i[n].slice(0,s)},c=function(t){return O.s(s%12||12,t,"0")},d=n.meridiem||function(t,e,n){var r=t<12?"AM":"PM";return n?r.toLowerCase():r},l={YY:String(this.$y).slice(-2),YYYY:this.$y,M:a+1,MM:O.s(a+1,2,"0"),MMM:h(n.monthsShort,a,f,3),MMMM:h(f,a),D:this.$D,DD:O.s(this.$D,2,"0"),d:String(this.$W),dd:h(n.weekdaysMin,this.$W,o,2),ddd:h(n.weekdaysShort,this.$W,o,3),dddd:o[this.$W],H:String(s),HH:O.s(s,2,"0"),h:c(1),hh:c(2),a:d(s,u,!0),A:d(s,u,!1),m:String(u),mm:O.s(u,2,"0"),s:String(this.$s),ss:O.s(this.$s,2,"0"),SSS:O.s(this.$ms,3,"0"),Z:i};return r.replace(y,(function(t,e){return e||l[t]||i.replace(":","")}))},m.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},m.diff=function(r,d,$){var l,y=O.p(d),M=w(r),m=(M.utcOffset()-this.utcOffset())*e,g=this-M,v=O.m(this,M);return v=(l={},l[c]=v/12,l[f]=v,l[h]=v/3,l[o]=(g-m)/6048e5,l[a]=(g-m)/864e5,l[u]=g/n,l[s]=g/e,l[i]=g/t,l)[y]||g,$?v:O.a(v)},m.daysInMonth=function(){return this.endOf(f).$D},m.$locale=function(){return D[this.$L]},m.locale=function(t,e){if(!t)return this.$L;var n=this.clone(),r=S(t,e,!0);return r&&(n.$L=r),n},m.clone=function(){return O.w(this.$d,this)},m.toDate=function(){return new Date(this.valueOf())},m.toJSON=function(){return this.isValid()?this.toISOString():null},m.toISOString=function(){return this.$d.toISOString()},m.toString=function(){return this.$d.toUTCString()},M}(),T=_.prototype;return w.prototype=T,[["$ms",r],["$s",i],["$m",s],["$H",u],["$W",a],["$M",f],["$y",c],["$D",d]].forEach((function(t){T[t[1]]=function(e){return this.$g(e,t[0],t[1])};})),w.extend=function(t,e){return t.$i||(t(e,_,w),t.$i=!0),w},w.locale=S,w.isDayjs=p,w.unix=function(t){return w(1e3*t)},w.en=D[v],w.Ls=D,w.p={},w}));
    });

    const percentageProgress = (startDate, endDate) => {
        const startDateMilli = dayjs_min(startDate).valueOf();
        const currDateMilli = dayjs_min(new Date()).valueOf();
        const endDateMilli = dayjs_min(endDate).valueOf();
        if (currDateMilli > endDateMilli) {
            return 100;
        }
        // if (startDateMilli < endDateMilli) {
        //     return 0;
        // }
        const progressMilli = currDateMilli - startDateMilli;
        const goalMilli = endDateMilli - startDateMilli;
        const percentage = (progressMilli / goalMilli) * 100;
        return Math.round(percentage);
    };
    const getHoursLeft = (startDate, endDate) => {
        const startDateMilli = dayjs_min(startDate).valueOf();
        const currDateMilli = dayjs_min(new Date()).valueOf();
        const endDateMilli = dayjs_min(endDate).valueOf();
        if (currDateMilli > endDateMilli) {
            return 0;
        }
        // if (startDateMilli < endDateMilli) {
        //     return 0;
        // }
        const diffMilli = currDateMilli - startDateMilli;
        return diffMilli / 360000;
    };
    const getRelativeTimeLeft = (startDate, endDate) => {
        const rtf = new Intl.RelativeTimeFormat("en", {
            localeMatcher: "best fit",
            numeric: "always",
            style: "long", // other values: "short" or "narrow"
        });
        const hours = getHoursLeft(startDate, endDate);
        if (hours === 0)
            return 'Completed';
        if (hours < 10)
            return rtf.format(hours, 'hours');
        const days = hours / 24;
        if (days < 10)
            return rtf.format(days, 'days');
        const months = days / 30;
        if (months < 10)
            return rtf.format(months, 'months');
        const years = months / 12;
        if (years < 10)
            return rtf.format(years, 'years');
        return 'Unknown';
    };

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\module\helloGames\currentExpeditionTile.svelte generated by Svelte v3.48.0 */

    const { Object: Object_1$1 } = globals;
    const file$9 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\module\\helloGames\\currentExpeditionTile.svelte";

    // (30:2) {#if networkState == NetworkState.Loading}
    function create_if_block_2$2(ctx) {
    	let slot;
    	let assistant_nms_tile_loading;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			assistant_nms_tile_loading = element("assistant-nms-tile-loading");
    			add_location(assistant_nms_tile_loading, file$9, 31, 6, 1347);
    			attr_dev(slot, "name", "loading");
    			add_location(slot, file$9, 30, 4, 1318);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    			append_dev(slot, assistant_nms_tile_loading);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(30:2) {#if networkState == NetworkState.Loading}",
    		ctx
    	});

    	return block;
    }

    // (35:2) {#if networkState == NetworkState.Error}
    function create_if_block_1$3(ctx) {
    	let slot;
    	let assistant_nms_common_tile;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			assistant_nms_common_tile = element("assistant-nms-common-tile");
    			set_custom_element_data(assistant_nms_common_tile, "imageurl", "https://app.nmsassistant.com/assets/images/error.png");
    			set_custom_element_data(assistant_nms_common_tile, "name", "Something went wrong");
    			add_location(assistant_nms_common_tile, file$9, 36, 6, 1476);
    			attr_dev(slot, "name", "error");
    			add_location(slot, file$9, 35, 4, 1449);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    			append_dev(slot, assistant_nms_common_tile);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(35:2) {#if networkState == NetworkState.Error}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {#if networkState == NetworkState.Success}
    function create_if_block$4(ctx) {
    	let assistant_nms_common_tile;
    	let div1;
    	let div0;
    	let div0_style_value;
    	let t0;
    	let span;
    	let t1;
    	let t2;
    	let t3;
    	let assistant_nms_common_tile_imageurl_value;
    	let assistant_nms_common_tile_name_value;

    	const block = {
    		c: function create() {
    			assistant_nms_common_tile = element("assistant-nms-common-tile");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			t1 = text(/*percentage*/ ctx[2]);
    			t2 = text("% - ");
    			t3 = text(/*relativeTimeLeft*/ ctx[3]);
    			attr_dev(div0, "class", "progress");
    			attr_dev(div0, "style", div0_style_value = `width: ${/*percentage*/ ctx[2]}%;`);
    			add_location(div0, file$9, 51, 8, 1997);
    			add_location(span, file$9, 52, 8, 2064);
    			attr_dev(div1, "slot", "subtitle");
    			attr_dev(div1, "class", "progressbar");
    			add_location(div1, file$9, 50, 6, 1946);
    			set_custom_element_data(assistant_nms_common_tile, "imageurl", assistant_nms_common_tile_imageurl_value = /*currentExpedition*/ ctx[1].imageUrl);
    			set_custom_element_data(assistant_nms_common_tile, "name", assistant_nms_common_tile_name_value = /*currentExpedition*/ ctx[1].name);
    			set_custom_element_data(assistant_nms_common_tile, "nametextalign", "center");
    			set_custom_element_data(assistant_nms_common_tile, "url", "https://app.nmsassistant.com/helloGames/seasonExpedition");
    			set_custom_element_data(assistant_nms_common_tile, "showsubtitle", true);
    			add_location(assistant_nms_common_tile, file$9, 43, 4, 1696);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, assistant_nms_common_tile, anchor);
    			append_dev(assistant_nms_common_tile, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(span, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*percentage*/ 4 && div0_style_value !== (div0_style_value = `width: ${/*percentage*/ ctx[2]}%;`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (dirty & /*percentage*/ 4) set_data_dev(t1, /*percentage*/ ctx[2]);
    			if (dirty & /*relativeTimeLeft*/ 8) set_data_dev(t3, /*relativeTimeLeft*/ ctx[3]);

    			if (dirty & /*currentExpedition*/ 2 && assistant_nms_common_tile_imageurl_value !== (assistant_nms_common_tile_imageurl_value = /*currentExpedition*/ ctx[1].imageUrl)) {
    				set_custom_element_data(assistant_nms_common_tile, "imageurl", assistant_nms_common_tile_imageurl_value);
    			}

    			if (dirty & /*currentExpedition*/ 2 && assistant_nms_common_tile_name_value !== (assistant_nms_common_tile_name_value = /*currentExpedition*/ ctx[1].name)) {
    				set_custom_element_data(assistant_nms_common_tile, "name", assistant_nms_common_tile_name_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(assistant_nms_common_tile);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(43:2) {#if networkState == NetworkState.Success}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block0 = /*networkState*/ ctx[0] == NetworkState.Loading && create_if_block_2$2(ctx);
    	let if_block1 = /*networkState*/ ctx[0] == NetworkState.Error && create_if_block_1$3(ctx);
    	let if_block2 = /*networkState*/ ctx[0] == NetworkState.Success && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			this.c = noop;
    			attr_dev(div, "class", "default-tile noselect");
    			add_location(div, file$9, 28, 0, 1231);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*networkState*/ ctx[0] == NetworkState.Loading) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2$2(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*networkState*/ ctx[0] == NetworkState.Error) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$3(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*networkState*/ ctx[0] == NetworkState.Success) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$4(ctx);
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-current-expedition-tile', slots, []);
    	let networkState = NetworkState.Loading;
    	let currentExpedition = anyObject;
    	let percentage = 0;
    	let relativeTimeLeft = "";

    	const fetchCurrentExpedition = async () => {
    		const anmsApi = new AssistantNmsApiService();
    		let currentExpResult = await anmsApi.getCurrentExpedition();

    		if (currentExpResult.isSuccess == false || currentExpResult.value == null) {
    			$$invalidate(0, networkState = NetworkState.Error);
    			return;
    		}

    		$$invalidate(1, currentExpedition = Object.assign({}, currentExpResult.value));
    		$$invalidate(0, networkState = NetworkState.Success);
    		$$invalidate(2, percentage = percentageProgress(currentExpedition.startDate, currentExpedition.endDate));
    		$$invalidate(3, relativeTimeLeft = getRelativeTimeLeft(currentExpedition.startDate, currentExpedition.endDate));
    	};

    	onMount(async () => {
    		fetchCurrentExpedition();
    	});

    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-current-expedition-tile> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		NetworkState,
    		AssistantNmsApiService,
    		anyObject,
    		getRelativeTimeLeft,
    		percentageProgress,
    		networkState,
    		currentExpedition,
    		percentage,
    		relativeTimeLeft,
    		fetchCurrentExpedition
    	});

    	$$self.$inject_state = $$props => {
    		if ('networkState' in $$props) $$invalidate(0, networkState = $$props.networkState);
    		if ('currentExpedition' in $$props) $$invalidate(1, currentExpedition = $$props.currentExpedition);
    		if ('percentage' in $$props) $$invalidate(2, percentage = $$props.percentage);
    		if ('relativeTimeLeft' in $$props) $$invalidate(3, relativeTimeLeft = $$props.relativeTimeLeft);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [networkState, currentExpedition, percentage, relativeTimeLeft];
    }

    class CurrentExpeditionTile extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.default-tile{--assistantnms-img-size:75px}.progressbar{position:relative;background:#000;width:100%;min-width:250px;height:20px;border-radius:5px}.progressbar span{position:absolute;top:0;left:50%;font-size:16px;font-weight:bold;transform:translateX(-50%);mix-blend-mode:difference}.progress{height:20px;border-radius:5px;background:var(--assistantnms-progress-bar-end-colour, #e0c83f);background:linear-gradient(
      to right,
      var(--assistantnms-progress-bar-start-colour, #f47c34),
      var(--assistantnms-progress-bar-end-colour, #e0c83f)
    );transition:600ms cubic-bezier(0.6, 0, 0.38, 1)}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$9,
    			create_fragment$9,
    			safe_not_equal,
    			{},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("assistant-nms-current-expedition-tile", CurrentExpeditionTile);

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\module\item\itemInfoTile.svelte generated by Svelte v3.48.0 */

    const { Object: Object_1 } = globals;
    const file$8 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\module\\item\\itemInfoTile.svelte";

    // (38:2) {#if networkState == NetworkState.Loading}
    function create_if_block_2$1(ctx) {
    	let slot;
    	let assistant_nms_tile_loading;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			assistant_nms_tile_loading = element("assistant-nms-tile-loading");
    			add_location(assistant_nms_tile_loading, file$8, 39, 6, 1367);
    			attr_dev(slot, "name", "loading");
    			add_location(slot, file$8, 38, 4, 1338);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    			append_dev(slot, assistant_nms_tile_loading);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(38:2) {#if networkState == NetworkState.Loading}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {#if networkState == NetworkState.Error}
    function create_if_block_1$2(ctx) {
    	let slot;
    	let assistant_nms_common_tile;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			assistant_nms_common_tile = element("assistant-nms-common-tile");
    			set_custom_element_data(assistant_nms_common_tile, "imageurl", "https://app.nmsassistant.com/assets/images/error.png");
    			set_custom_element_data(assistant_nms_common_tile, "name", "Something went wrong");
    			add_location(assistant_nms_common_tile, file$8, 44, 6, 1496);
    			attr_dev(slot, "name", "error");
    			add_location(slot, file$8, 43, 4, 1469);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    			append_dev(slot, assistant_nms_common_tile);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(43:2) {#if networkState == NetworkState.Error}",
    		ctx
    	});

    	return block;
    }

    // (51:2) {#if networkState == NetworkState.Success}
    function create_if_block$3(ctx) {
    	let assistant_nms_common_tile;
    	let assistant_nms_common_tile_imageurl_value;
    	let assistant_nms_common_tile_bgcolour_value;
    	let assistant_nms_common_tile_name_value;
    	let assistant_nms_common_tile_url_value;

    	const block = {
    		c: function create() {
    			assistant_nms_common_tile = element("assistant-nms-common-tile");
    			set_custom_element_data(assistant_nms_common_tile, "imageurl", assistant_nms_common_tile_imageurl_value = /*itemInfo*/ ctx[1].iconUrl);
    			set_custom_element_data(assistant_nms_common_tile, "bgcolour", assistant_nms_common_tile_bgcolour_value = /*itemInfo*/ ctx[1].colour);
    			set_custom_element_data(assistant_nms_common_tile, "name", assistant_nms_common_tile_name_value = /*itemInfo*/ ctx[1].name);
    			set_custom_element_data(assistant_nms_common_tile, "url", assistant_nms_common_tile_url_value = /*itemInfo*/ ctx[1].link);
    			add_location(assistant_nms_common_tile, file$8, 64, 4, 2077);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, assistant_nms_common_tile, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*itemInfo*/ 2 && assistant_nms_common_tile_imageurl_value !== (assistant_nms_common_tile_imageurl_value = /*itemInfo*/ ctx[1].iconUrl)) {
    				set_custom_element_data(assistant_nms_common_tile, "imageurl", assistant_nms_common_tile_imageurl_value);
    			}

    			if (dirty & /*itemInfo*/ 2 && assistant_nms_common_tile_bgcolour_value !== (assistant_nms_common_tile_bgcolour_value = /*itemInfo*/ ctx[1].colour)) {
    				set_custom_element_data(assistant_nms_common_tile, "bgcolour", assistant_nms_common_tile_bgcolour_value);
    			}

    			if (dirty & /*itemInfo*/ 2 && assistant_nms_common_tile_name_value !== (assistant_nms_common_tile_name_value = /*itemInfo*/ ctx[1].name)) {
    				set_custom_element_data(assistant_nms_common_tile, "name", assistant_nms_common_tile_name_value);
    			}

    			if (dirty & /*itemInfo*/ 2 && assistant_nms_common_tile_url_value !== (assistant_nms_common_tile_url_value = /*itemInfo*/ ctx[1].link)) {
    				set_custom_element_data(assistant_nms_common_tile, "url", assistant_nms_common_tile_url_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(assistant_nms_common_tile);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(51:2) {#if networkState == NetworkState.Success}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block0 = /*networkState*/ ctx[0] == NetworkState.Loading && create_if_block_2$1(ctx);
    	let if_block1 = /*networkState*/ ctx[0] == NetworkState.Error && create_if_block_1$2(ctx);
    	let if_block2 = /*networkState*/ ctx[0] == NetworkState.Success && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			this.c = noop;
    			attr_dev(div, "class", "noselect");
    			add_location(div, file$8, 36, 0, 1264);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*networkState*/ ctx[0] == NetworkState.Loading) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*networkState*/ ctx[0] == NetworkState.Error) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$2(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*networkState*/ ctx[0] == NetworkState.Success) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$3(ctx);
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-item-info-tile', slots, []);
    	let networkState = NetworkState.Loading;
    	let itemInfo = anyObject;
    	let { appid = "" } = $$props;
    	let { gameid = "" } = $$props;
    	let { langcode = "en" } = $$props;

    	const fetchAppDetails = async () => {
    		const anmsApi = new AssistantNmsApiService();

    		let itemInfoResult = {
    			isSuccess: false,
    			value: anyObject,
    			errorMessage: "not initialised"
    		};

    		if (appid != null && appid.length > 3) {
    			itemInfoResult = await anmsApi.getItemInfoAppId(appid, langcode);
    		} else if (gameid != null && gameid.length > 3) {
    			itemInfoResult = await anmsApi.getItemInfoGameId(gameid, langcode);
    		}

    		if (itemInfoResult.isSuccess == false || itemInfoResult.value == null) {
    			$$invalidate(0, networkState = NetworkState.Error);
    			return;
    		}

    		$$invalidate(1, itemInfo = Object.assign({}, itemInfoResult.value));
    		$$invalidate(0, networkState = NetworkState.Success);
    	};

    	onMount(async () => {
    		fetchAppDetails();
    	});

    	const writable_props = ['appid', 'gameid', 'langcode'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-item-info-tile> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('appid' in $$props) $$invalidate(2, appid = $$props.appid);
    		if ('gameid' in $$props) $$invalidate(3, gameid = $$props.gameid);
    		if ('langcode' in $$props) $$invalidate(4, langcode = $$props.langcode);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		NetworkState,
    		AssistantNmsApiService,
    		anyObject,
    		networkState,
    		itemInfo,
    		appid,
    		gameid,
    		langcode,
    		fetchAppDetails
    	});

    	$$self.$inject_state = $$props => {
    		if ('networkState' in $$props) $$invalidate(0, networkState = $$props.networkState);
    		if ('itemInfo' in $$props) $$invalidate(1, itemInfo = $$props.itemInfo);
    		if ('appid' in $$props) $$invalidate(2, appid = $$props.appid);
    		if ('gameid' in $$props) $$invalidate(3, gameid = $$props.gameid);
    		if ('langcode' in $$props) $$invalidate(4, langcode = $$props.langcode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [networkState, itemInfo, appid, gameid, langcode];
    }

    class ItemInfoTile extends SvelteElement {
    	constructor(options) {
    		super();

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$8,
    			create_fragment$8,
    			safe_not_equal,
    			{ appid: 2, gameid: 3, langcode: 4 },
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["appid", "gameid", "langcode"];
    	}

    	get appid() {
    		return this.$$.ctx[2];
    	}

    	set appid(appid) {
    		this.$$set({ appid });
    		flush();
    	}

    	get gameid() {
    		return this.$$.ctx[3];
    	}

    	set gameid(gameid) {
    		this.$$set({ gameid });
    		flush();
    	}

    	get langcode() {
    		return this.$$.ctx[4];
    	}

    	set langcode(langcode) {
    		this.$$set({ langcode });
    		flush();
    	}
    }

    customElements.define("assistant-nms-item-info-tile", ItemInfoTile);

    class ZenoFMApiService extends BaseApiService {
        constructor() {
            super('https://zenoplay.zenomedia.com/api');
            this.getNowPlaying = () => this.get(`zenofm/nowplaying/9kz76c8mdg8uv`);
        }
    }

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\module\nmsfm\nmsfmTile.svelte generated by Svelte v3.48.0 */
    const file$7 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\module\\nmsfm\\nmsfmTile.svelte";

    // (30:6) {#if artist.length > 0}
    function create_if_block_1$1(ctx) {
    	let h3;
    	let t;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text(/*artist*/ ctx[0]);
    			add_location(h3, file$7, 30, 8, 1012);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*artist*/ 1) set_data_dev(t, /*artist*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(30:6) {#if artist.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (33:6) {#if trackName.length > 0}
    function create_if_block$2(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*trackName*/ ctx[1]);
    			add_location(p, file$7, 33, 8, 1086);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*trackName*/ 2) set_data_dev(t, /*trackName*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(33:6) {#if trackName.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div2;
    	let div1;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let audio;
    	let source;
    	let source_src_value;
    	let t3;
    	let if_block0 = /*artist*/ ctx[0].length > 0 && create_if_block_1$1(ctx);
    	let if_block1 = /*trackName*/ ctx[1].length > 0 && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			audio = element("audio");
    			source = element("source");
    			t3 = text("\r\n        Your browser does not support the audio element.");
    			this.c = noop;
    			if (!src_url_equal(img.src, img_src_value = "https://app.nmsassistant.com/assets/images/special/nmsfmDrawer.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "nmsfm-img");
    			attr_dev(img, "alt", "nmsfm logo");
    			toggle_class(img, "small", /*artist*/ ctx[0].length < 1 && /*trackName*/ ctx[1].length < 1);
    			add_location(img, file$7, 22, 4, 734);
    			if (!src_url_equal(source.src, source_src_value = "https://stream.zenolive.com/9kz76c8mdg8uv.aac")) attr_dev(source, "src", source_src_value);
    			attr_dev(source, "type", "audio/ogg");
    			add_location(source, file$7, 36, 8, 1171);
    			audio.controls = true;
    			attr_dev(audio, "class", "nmsfm-audio");
    			add_location(audio, file$7, 35, 6, 1125);
    			attr_dev(div0, "class", "nmsfm-content");
    			add_location(div0, file$7, 28, 4, 944);
    			attr_dev(div1, "class", "nmsfm-container");
    			add_location(div1, file$7, 21, 2, 699);
    			attr_dev(div2, "class", "noselect");
    			add_location(div2, file$7, 20, 0, 673);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t1);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t2);
    			append_dev(div0, audio);
    			append_dev(audio, source);
    			append_dev(audio, t3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*artist, trackName*/ 3) {
    				toggle_class(img, "small", /*artist*/ ctx[0].length < 1 && /*trackName*/ ctx[1].length < 1);
    			}

    			if (/*artist*/ ctx[0].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(div0, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*trackName*/ ctx[1].length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(div0, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-nmsfm-tile', slots, []);
    	let artist = "";
    	let trackName = "";

    	const fetchTrackDetails = async () => {
    		const zenoApi = new ZenoFMApiService();
    		let nowPlayingResult = await zenoApi.getNowPlaying();

    		if (nowPlayingResult.isSuccess && nowPlayingResult.value != null) {
    			$$invalidate(0, artist = nowPlayingResult.value.artist);
    			$$invalidate(1, trackName = nowPlayingResult.value.title);
    		}
    	};

    	const interval = setInterval(fetchTrackDetails, 10000);

    	onDestroy(() => {
    		clearInterval(interval);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-nmsfm-tile> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onDestroy,
    		ZenoFMApiService,
    		artist,
    		trackName,
    		fetchTrackDetails,
    		interval
    	});

    	$$self.$inject_state = $$props => {
    		if ('artist' in $$props) $$invalidate(0, artist = $$props.artist);
    		if ('trackName' in $$props) $$invalidate(1, trackName = $$props.trackName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [artist, trackName];
    }

    class NmsfmTile extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>.nmsfm-container{display:inline-flex;flex-direction:row;padding-right:1em;width:var(--assistantnms-tile-width, unset);max-width:100%;border-radius:0.5em var(--assistantnms-border-radius, 0.5em)
      var(--assistantnms-border-radius, 0.5em) 0.5em;color:var(--assistantnms-tile-fg-colour, #c5c5c5);background-color:var(--assistantnms-tile-bg-colour, #303030);text-decoration:none}.nmsfm-img{border-top-left-radius:var(--assistantnms-border-radius, 0.25em);border-bottom-left-radius:var(--assistantnms-border-radius, 0.25em);max-height:100%}.nmsfm-img.small{max-height:5em}.nmsfm-content{flex-grow:1;display:flex;flex-direction:column;justify-content:center;padding-left:1em;overflow:hidden}.nmsfm-content h3,.nmsfm-content p{margin:0;padding:0}.nmsfm-content p{padding-bottom:0.5em}.nmsfm-audio{border-radius:var(--assistantnms-border-radius, 0.25em);background-color:white}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$7,
    			create_fragment$7,
    			safe_not_equal,
    			{},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("assistant-nms-nmsfm-tile", NmsfmTile);

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\shared\commonTile.svelte generated by Svelte v3.48.0 */

    const file$6 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\shared\\commonTile.svelte";

    // (28:4) {#if showsubtitle}
    function create_if_block$1(ctx) {
    	let div;
    	let slot;

    	const block = {
    		c: function create() {
    			div = element("div");
    			slot = element("slot");
    			attr_dev(slot, "name", "subtitle");
    			add_location(slot, file$6, 29, 8, 855);
    			attr_dev(div, "class", "quantity-container single-line");
    			add_location(div, file$6, 28, 6, 801);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, slot);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(28:4) {#if showsubtitle}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let a;
    	let div0;
    	let img;
    	let img_src_value;
    	let div0_class_value;
    	let div0_style_value;
    	let t0;
    	let div2;
    	let div1;
    	let p;
    	let t1;
    	let p_class_value;
    	let t2;
    	let if_block = /*showsubtitle*/ ctx[6] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			a = element("a");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			p = element("p");
    			t1 = text(/*name*/ ctx[2]);
    			t2 = space();
    			if (if_block) if_block.c();
    			this.c = noop;
    			if (!src_url_equal(img.src, img_src_value = /*imageurl*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "loading");
    			attr_dev(img, "draggable", false);
    			add_location(img, file$6, 21, 4, 523);
    			attr_dev(div0, "class", div0_class_value = "image-container " + /*imageclass*/ ctx[1]);
    			attr_dev(div0, "style", div0_style_value = `background-color: #${/*bgcolour*/ ctx[4]};`);
    			add_location(div0, file$6, 17, 2, 419);
    			attr_dev(p, "class", p_class_value = "single-line " + /*nametextalign*/ ctx[3]);
    			add_location(p, file$6, 25, 6, 708);
    			attr_dev(div1, "class", "text-container");
    			toggle_class(div1, "full", /*showsubtitle*/ ctx[6] == false);
    			add_location(div1, file$6, 24, 4, 637);
    			attr_dev(div2, "class", "gen-item-content-container");
    			add_location(div2, file$6, 23, 2, 591);
    			attr_dev(a, "href", /*url*/ ctx[5]);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener noreferrer");
    			attr_dev(a, "class", "gen-item-container noselect");
    			add_location(a, file$6, 11, 0, 309);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, div0);
    			append_dev(div0, img);
    			append_dev(a, t0);
    			append_dev(a, div2);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(div2, t2);
    			if (if_block) if_block.m(div2, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imageurl*/ 1 && !src_url_equal(img.src, img_src_value = /*imageurl*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*imageclass*/ 2 && div0_class_value !== (div0_class_value = "image-container " + /*imageclass*/ ctx[1])) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*bgcolour*/ 16 && div0_style_value !== (div0_style_value = `background-color: #${/*bgcolour*/ ctx[4]};`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}

    			if (dirty & /*name*/ 4) set_data_dev(t1, /*name*/ ctx[2]);

    			if (dirty & /*nametextalign*/ 8 && p_class_value !== (p_class_value = "single-line " + /*nametextalign*/ ctx[3])) {
    				attr_dev(p, "class", p_class_value);
    			}

    			if (dirty & /*showsubtitle*/ 64) {
    				toggle_class(div1, "full", /*showsubtitle*/ ctx[6] == false);
    			}

    			if (/*showsubtitle*/ ctx[6]) {
    				if (if_block) ; else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*url*/ 32) {
    				attr_dev(a, "href", /*url*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-common-tile', slots, []);
    	let { imageurl = "" } = $$props;
    	let { imageclass = "" } = $$props;
    	let { name = "" } = $$props;
    	let { nametextalign = "" } = $$props;
    	let { bgcolour = "2c7c9f" } = $$props;
    	let { url = "https://nmsassistant.com" } = $$props;
    	let { showsubtitle = false } = $$props;

    	const writable_props = [
    		'imageurl',
    		'imageclass',
    		'name',
    		'nametextalign',
    		'bgcolour',
    		'url',
    		'showsubtitle'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-common-tile> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('imageurl' in $$props) $$invalidate(0, imageurl = $$props.imageurl);
    		if ('imageclass' in $$props) $$invalidate(1, imageclass = $$props.imageclass);
    		if ('name' in $$props) $$invalidate(2, name = $$props.name);
    		if ('nametextalign' in $$props) $$invalidate(3, nametextalign = $$props.nametextalign);
    		if ('bgcolour' in $$props) $$invalidate(4, bgcolour = $$props.bgcolour);
    		if ('url' in $$props) $$invalidate(5, url = $$props.url);
    		if ('showsubtitle' in $$props) $$invalidate(6, showsubtitle = $$props.showsubtitle);
    	};

    	$$self.$capture_state = () => ({
    		imageurl,
    		imageclass,
    		name,
    		nametextalign,
    		bgcolour,
    		url,
    		showsubtitle
    	});

    	$$self.$inject_state = $$props => {
    		if ('imageurl' in $$props) $$invalidate(0, imageurl = $$props.imageurl);
    		if ('imageclass' in $$props) $$invalidate(1, imageclass = $$props.imageclass);
    		if ('name' in $$props) $$invalidate(2, name = $$props.name);
    		if ('nametextalign' in $$props) $$invalidate(3, nametextalign = $$props.nametextalign);
    		if ('bgcolour' in $$props) $$invalidate(4, bgcolour = $$props.bgcolour);
    		if ('url' in $$props) $$invalidate(5, url = $$props.url);
    		if ('showsubtitle' in $$props) $$invalidate(6, showsubtitle = $$props.showsubtitle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [imageurl, imageclass, name, nametextalign, bgcolour, url, showsubtitle];
    }

    class CommonTile extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>*{font-family:var(
      --assistantnms-font-family,
      "Roboto",
      Helvetica,
      Arial,
      sans-serif
    );font-weight:var(--assistantnms-font-weight, "bold")}.noselect{-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.gen-item-container{display:inline-flex;padding-right:1em;width:var(--assistantnms-tile-width, unset);max-width:100%;border-radius:0.5em var(--assistantnms-border-radius, 0.5em)
      var(--assistantnms-border-radius, 0.5em) 0.5em;color:var(--assistantnms-tile-fg-colour, #c5c5c5);background-color:var(--assistantnms-tile-bg-colour, #303030);text-decoration:none}.image-container{height:var(--assistantnms-img-size, 100px);width:var(--assistantnms-img-size, 100px);display:flex;flex-direction:column;justify-content:center;position:relative;border-top-left-radius:var(--assistantnms-border-radius, 0.25em);border-bottom-left-radius:var(--assistantnms-border-radius, 0.25em)}.image-container.x2,.image-container.x2 img{max-height:calc(var(--assistantnms-img-size, 100px) * 1.5);width:calc(var(--assistantnms-img-size, 100px) * 1.5)}.image-container img{max-height:var(--assistantnms-img-size, 100px);width:100%;border-top-left-radius:var(--assistantnms-border-radius, 0.25em);border-bottom-left-radius:var(--assistantnms-border-radius, 0.25em)}.gen-item-content-container{flex-grow:1;max-height:var(--assistantnms-img-size, 100px);position:relative;overflow:hidden}.gen-item-content-container p{margin:0}.single-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.single-line.center{text-align:center}.gen-item-content-container .text-container{font-size:var(--assistantnms-name-font-size, 1.2em);text-align:left;padding-top:0.6em;padding-left:1rem;padding-right:0.25rem}.gen-item-content-container .text-container.full{padding-top:0}.gen-item-content-container .text-container.full p{line-height:var(--assistantnms-img-size, 100px)}.gen-item-content-container .quantity-container{padding-left:1.05rem;padding-right:0.21rem;max-width:100%;overflow:hidden;text-align:left;text-overflow:ellipsis;white-space:nowrap}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$6,
    			create_fragment$6,
    			safe_not_equal,
    			{
    				imageurl: 0,
    				imageclass: 1,
    				name: 2,
    				nametextalign: 3,
    				bgcolour: 4,
    				url: 5,
    				showsubtitle: 6
    			},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return [
    			"imageurl",
    			"imageclass",
    			"name",
    			"nametextalign",
    			"bgcolour",
    			"url",
    			"showsubtitle"
    		];
    	}

    	get imageurl() {
    		return this.$$.ctx[0];
    	}

    	set imageurl(imageurl) {
    		this.$$set({ imageurl });
    		flush();
    	}

    	get imageclass() {
    		return this.$$.ctx[1];
    	}

    	set imageclass(imageclass) {
    		this.$$set({ imageclass });
    		flush();
    	}

    	get name() {
    		return this.$$.ctx[2];
    	}

    	set name(name) {
    		this.$$set({ name });
    		flush();
    	}

    	get nametextalign() {
    		return this.$$.ctx[3];
    	}

    	set nametextalign(nametextalign) {
    		this.$$set({ nametextalign });
    		flush();
    	}

    	get bgcolour() {
    		return this.$$.ctx[4];
    	}

    	set bgcolour(bgcolour) {
    		this.$$set({ bgcolour });
    		flush();
    	}

    	get url() {
    		return this.$$.ctx[5];
    	}

    	set url(url) {
    		this.$$set({ url });
    		flush();
    	}

    	get showsubtitle() {
    		return this.$$.ctx[6];
    	}

    	set showsubtitle(showsubtitle) {
    		this.$$set({ showsubtitle });
    		flush();
    	}
    }

    customElements.define("assistant-nms-common-tile", CommonTile);

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\shared\loadingWithSlots.svelte generated by Svelte v3.48.0 */
    const file$5 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\shared\\loadingWithSlots.svelte";

    // (8:2) {#if networkstate == NetworkState.Loading}
    function create_if_block_2(ctx) {
    	let slot;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			attr_dev(slot, "name", "loading");
    			add_location(slot, file$5, 8, 4, 240);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(8:2) {#if networkstate == NetworkState.Loading}",
    		ctx
    	});

    	return block;
    }

    // (11:2) {#if networkstate == NetworkState.Error}
    function create_if_block_1(ctx) {
    	let slot;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			slot.textContent = "error";
    			attr_dev(slot, "name", "error");
    			add_location(slot, file$5, 11, 4, 322);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(11:2) {#if networkstate == NetworkState.Error}",
    		ctx
    	});

    	return block;
    }

    // (14:2) {#if networkstate == NetworkState.Success}
    function create_if_block(ctx) {
    	let slot;
    	let div;
    	let span;
    	let t0;
    	let b;
    	let t2;

    	const block = {
    		c: function create() {
    			slot = element("slot");
    			div = element("div");
    			span = element("span");
    			t0 = text("Nothing supplied in the ");
    			b = element("b");
    			b.textContent = "loaded";
    			t2 = text(" slot");
    			add_location(b, file$5, 16, 38, 514);
    			add_location(span, file$5, 16, 8, 484);
    			set_style(div, "text-align", "center");
    			add_location(div, file$5, 15, 6, 442);
    			attr_dev(slot, "name", "loaded");
    			add_location(slot, file$5, 14, 4, 414);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, slot, anchor);
    			append_dev(slot, div);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, b);
    			append_dev(span, t2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(slot);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(14:2) {#if networkstate == NetworkState.Success}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block0 = /*networkstate*/ ctx[0] == NetworkState.Loading && create_if_block_2(ctx);
    	let if_block1 = /*networkstate*/ ctx[0] == NetworkState.Error && create_if_block_1(ctx);
    	let if_block2 = /*networkstate*/ ctx[0] == NetworkState.Success && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			this.c = noop;
    			attr_dev(div, "class", "noselect");
    			add_location(div, file$5, 6, 0, 166);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*networkstate*/ ctx[0] == NetworkState.Loading) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*networkstate*/ ctx[0] == NetworkState.Error) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*networkstate*/ ctx[0] == NetworkState.Success) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-loading', slots, []);
    	let { networkstate } = $$props;
    	const writable_props = ['networkstate'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-loading> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('networkstate' in $$props) $$invalidate(0, networkstate = $$props.networkstate);
    	};

    	$$self.$capture_state = () => ({ NetworkState, networkstate });

    	$$self.$inject_state = $$props => {
    		if ('networkstate' in $$props) $$invalidate(0, networkstate = $$props.networkstate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [networkstate];
    }

    class LoadingWithSlots extends SvelteElement {
    	constructor(options) {
    		super();

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{ networkstate: 0 },
    			null
    		);

    		const { ctx } = this.$$;
    		const props = this.attributes;

    		if (/*networkstate*/ ctx[0] === undefined && !('networkstate' in props)) {
    			console.warn("<assistant-nms-loading> was created without expected prop 'networkstate'");
    		}

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["networkstate"];
    	}

    	get networkstate() {
    		return this.$$.ctx[0];
    	}

    	set networkstate(networkstate) {
    		this.$$set({ networkstate });
    		flush();
    	}
    }

    customElements.define("assistant-nms-loading", LoadingWithSlots);

    /**
     * marked - a markdown parser
     * Copyright (c) 2011-2022, Christopher Jeffrey. (MIT Licensed)
     * https://github.com/markedjs/marked
     */

    /**
     * DO NOT EDIT THIS FILE
     * The code in this file is generated from files in ./src/
     */

    function getDefaults() {
      return {
        baseUrl: null,
        breaks: false,
        extensions: null,
        gfm: true,
        headerIds: true,
        headerPrefix: '',
        highlight: null,
        langPrefix: 'language-',
        mangle: true,
        pedantic: false,
        renderer: null,
        sanitize: false,
        sanitizer: null,
        silent: false,
        smartLists: false,
        smartypants: false,
        tokenizer: null,
        walkTokens: null,
        xhtml: false
      };
    }

    let defaults = getDefaults();

    function changeDefaults(newDefaults) {
      defaults = newDefaults;
    }

    /**
     * Helpers
     */
    const escapeTest = /[&<>"']/;
    const escapeReplace = /[&<>"']/g;
    const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
    const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
    const escapeReplacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    const getEscapeReplacement = (ch) => escapeReplacements[ch];
    function escape(html, encode) {
      if (encode) {
        if (escapeTest.test(html)) {
          return html.replace(escapeReplace, getEscapeReplacement);
        }
      } else {
        if (escapeTestNoEncode.test(html)) {
          return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
        }
      }

      return html;
    }

    const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;

    /**
     * @param {string} html
     */
    function unescape(html) {
      // explicitly match decimal, hex, and named HTML entities
      return html.replace(unescapeTest, (_, n) => {
        n = n.toLowerCase();
        if (n === 'colon') return ':';
        if (n.charAt(0) === '#') {
          return n.charAt(1) === 'x'
            ? String.fromCharCode(parseInt(n.substring(2), 16))
            : String.fromCharCode(+n.substring(1));
        }
        return '';
      });
    }

    const caret = /(^|[^\[])\^/g;

    /**
     * @param {string | RegExp} regex
     * @param {string} opt
     */
    function edit(regex, opt) {
      regex = typeof regex === 'string' ? regex : regex.source;
      opt = opt || '';
      const obj = {
        replace: (name, val) => {
          val = val.source || val;
          val = val.replace(caret, '$1');
          regex = regex.replace(name, val);
          return obj;
        },
        getRegex: () => {
          return new RegExp(regex, opt);
        }
      };
      return obj;
    }

    const nonWordAndColonTest = /[^\w:]/g;
    const originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;

    /**
     * @param {boolean} sanitize
     * @param {string} base
     * @param {string} href
     */
    function cleanUrl(sanitize, base, href) {
      if (sanitize) {
        let prot;
        try {
          prot = decodeURIComponent(unescape(href))
            .replace(nonWordAndColonTest, '')
            .toLowerCase();
        } catch (e) {
          return null;
        }
        if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
          return null;
        }
      }
      if (base && !originIndependentUrl.test(href)) {
        href = resolveUrl(base, href);
      }
      try {
        href = encodeURI(href).replace(/%25/g, '%');
      } catch (e) {
        return null;
      }
      return href;
    }

    const baseUrls = {};
    const justDomain = /^[^:]+:\/*[^/]*$/;
    const protocol = /^([^:]+:)[\s\S]*$/;
    const domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;

    /**
     * @param {string} base
     * @param {string} href
     */
    function resolveUrl(base, href) {
      if (!baseUrls[' ' + base]) {
        // we can ignore everything in base after the last slash of its path component,
        // but we might need to add _that_
        // https://tools.ietf.org/html/rfc3986#section-3
        if (justDomain.test(base)) {
          baseUrls[' ' + base] = base + '/';
        } else {
          baseUrls[' ' + base] = rtrim(base, '/', true);
        }
      }
      base = baseUrls[' ' + base];
      const relativeBase = base.indexOf(':') === -1;

      if (href.substring(0, 2) === '//') {
        if (relativeBase) {
          return href;
        }
        return base.replace(protocol, '$1') + href;
      } else if (href.charAt(0) === '/') {
        if (relativeBase) {
          return href;
        }
        return base.replace(domain, '$1') + href;
      } else {
        return base + href;
      }
    }

    const noopTest = { exec: function noopTest() {} };

    function merge(obj) {
      let i = 1,
        target,
        key;

      for (; i < arguments.length; i++) {
        target = arguments[i];
        for (key in target) {
          if (Object.prototype.hasOwnProperty.call(target, key)) {
            obj[key] = target[key];
          }
        }
      }

      return obj;
    }

    function splitCells(tableRow, count) {
      // ensure that every cell-delimiting pipe has a space
      // before it to distinguish it from an escaped pipe
      const row = tableRow.replace(/\|/g, (match, offset, str) => {
          let escaped = false,
            curr = offset;
          while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
          if (escaped) {
            // odd number of slashes means | is escaped
            // so we leave it alone
            return '|';
          } else {
            // add space before unescaped |
            return ' |';
          }
        }),
        cells = row.split(/ \|/);
      let i = 0;

      // First/last cell in a row cannot be empty if it has no leading/trailing pipe
      if (!cells[0].trim()) { cells.shift(); }
      if (cells.length > 0 && !cells[cells.length - 1].trim()) { cells.pop(); }

      if (cells.length > count) {
        cells.splice(count);
      } else {
        while (cells.length < count) cells.push('');
      }

      for (; i < cells.length; i++) {
        // leading or trailing whitespace is ignored per the gfm spec
        cells[i] = cells[i].trim().replace(/\\\|/g, '|');
      }
      return cells;
    }

    /**
     * Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
     * /c*$/ is vulnerable to REDOS.
     *
     * @param {string} str
     * @param {string} c
     * @param {boolean} invert Remove suffix of non-c chars instead. Default falsey.
     */
    function rtrim(str, c, invert) {
      const l = str.length;
      if (l === 0) {
        return '';
      }

      // Length of suffix matching the invert condition.
      let suffLen = 0;

      // Step left until we fail to match the invert condition.
      while (suffLen < l) {
        const currChar = str.charAt(l - suffLen - 1);
        if (currChar === c && !invert) {
          suffLen++;
        } else if (currChar !== c && invert) {
          suffLen++;
        } else {
          break;
        }
      }

      return str.slice(0, l - suffLen);
    }

    function findClosingBracket(str, b) {
      if (str.indexOf(b[1]) === -1) {
        return -1;
      }
      const l = str.length;
      let level = 0,
        i = 0;
      for (; i < l; i++) {
        if (str[i] === '\\') {
          i++;
        } else if (str[i] === b[0]) {
          level++;
        } else if (str[i] === b[1]) {
          level--;
          if (level < 0) {
            return i;
          }
        }
      }
      return -1;
    }

    function checkSanitizeDeprecation(opt) {
      if (opt && opt.sanitize && !opt.silent) {
        console.warn('marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options');
      }
    }

    // copied from https://stackoverflow.com/a/5450113/806777
    /**
     * @param {string} pattern
     * @param {number} count
     */
    function repeatString(pattern, count) {
      if (count < 1) {
        return '';
      }
      let result = '';
      while (count > 1) {
        if (count & 1) {
          result += pattern;
        }
        count >>= 1;
        pattern += pattern;
      }
      return result + pattern;
    }

    function outputLink(cap, link, raw, lexer) {
      const href = link.href;
      const title = link.title ? escape(link.title) : null;
      const text = cap[1].replace(/\\([\[\]])/g, '$1');

      if (cap[0].charAt(0) !== '!') {
        lexer.state.inLink = true;
        const token = {
          type: 'link',
          raw,
          href,
          title,
          text,
          tokens: lexer.inlineTokens(text, [])
        };
        lexer.state.inLink = false;
        return token;
      }
      return {
        type: 'image',
        raw,
        href,
        title,
        text: escape(text)
      };
    }

    function indentCodeCompensation(raw, text) {
      const matchIndentToCode = raw.match(/^(\s+)(?:```)/);

      if (matchIndentToCode === null) {
        return text;
      }

      const indentToCode = matchIndentToCode[1];

      return text
        .split('\n')
        .map(node => {
          const matchIndentInNode = node.match(/^\s+/);
          if (matchIndentInNode === null) {
            return node;
          }

          const [indentInNode] = matchIndentInNode;

          if (indentInNode.length >= indentToCode.length) {
            return node.slice(indentToCode.length);
          }

          return node;
        })
        .join('\n');
    }

    /**
     * Tokenizer
     */
    class Tokenizer {
      constructor(options) {
        this.options = options || defaults;
      }

      space(src) {
        const cap = this.rules.block.newline.exec(src);
        if (cap && cap[0].length > 0) {
          return {
            type: 'space',
            raw: cap[0]
          };
        }
      }

      code(src) {
        const cap = this.rules.block.code.exec(src);
        if (cap) {
          const text = cap[0].replace(/^ {1,4}/gm, '');
          return {
            type: 'code',
            raw: cap[0],
            codeBlockStyle: 'indented',
            text: !this.options.pedantic
              ? rtrim(text, '\n')
              : text
          };
        }
      }

      fences(src) {
        const cap = this.rules.block.fences.exec(src);
        if (cap) {
          const raw = cap[0];
          const text = indentCodeCompensation(raw, cap[3] || '');

          return {
            type: 'code',
            raw,
            lang: cap[2] ? cap[2].trim() : cap[2],
            text
          };
        }
      }

      heading(src) {
        const cap = this.rules.block.heading.exec(src);
        if (cap) {
          let text = cap[2].trim();

          // remove trailing #s
          if (/#$/.test(text)) {
            const trimmed = rtrim(text, '#');
            if (this.options.pedantic) {
              text = trimmed.trim();
            } else if (!trimmed || / $/.test(trimmed)) {
              // CommonMark requires space before trailing #s
              text = trimmed.trim();
            }
          }

          const token = {
            type: 'heading',
            raw: cap[0],
            depth: cap[1].length,
            text,
            tokens: []
          };
          this.lexer.inline(token.text, token.tokens);
          return token;
        }
      }

      hr(src) {
        const cap = this.rules.block.hr.exec(src);
        if (cap) {
          return {
            type: 'hr',
            raw: cap[0]
          };
        }
      }

      blockquote(src) {
        const cap = this.rules.block.blockquote.exec(src);
        if (cap) {
          const text = cap[0].replace(/^ *>[ \t]?/gm, '');

          return {
            type: 'blockquote',
            raw: cap[0],
            tokens: this.lexer.blockTokens(text, []),
            text
          };
        }
      }

      list(src) {
        let cap = this.rules.block.list.exec(src);
        if (cap) {
          let raw, istask, ischecked, indent, i, blankLine, endsWithBlankLine,
            line, nextLine, rawLine, itemContents, endEarly;

          let bull = cap[1].trim();
          const isordered = bull.length > 1;

          const list = {
            type: 'list',
            raw: '',
            ordered: isordered,
            start: isordered ? +bull.slice(0, -1) : '',
            loose: false,
            items: []
          };

          bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;

          if (this.options.pedantic) {
            bull = isordered ? bull : '[*+-]';
          }

          // Get next list item
          const itemRegex = new RegExp(`^( {0,3}${bull})((?:[\t ][^\\n]*)?(?:\\n|$))`);

          // Check if current bullet point can start a new List Item
          while (src) {
            endEarly = false;
            if (!(cap = itemRegex.exec(src))) {
              break;
            }

            if (this.rules.block.hr.test(src)) { // End list if bullet was actually HR (possibly move into itemRegex?)
              break;
            }

            raw = cap[0];
            src = src.substring(raw.length);

            line = cap[2].split('\n', 1)[0];
            nextLine = src.split('\n', 1)[0];

            if (this.options.pedantic) {
              indent = 2;
              itemContents = line.trimLeft();
            } else {
              indent = cap[2].search(/[^ ]/); // Find first non-space char
              indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
              itemContents = line.slice(indent);
              indent += cap[1].length;
            }

            blankLine = false;

            if (!line && /^ *$/.test(nextLine)) { // Items begin with at most one blank line
              raw += nextLine + '\n';
              src = src.substring(nextLine.length + 1);
              endEarly = true;
            }

            if (!endEarly) {
              const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?: [^\\n]*)?(?:\\n|$))`);
              const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);

              // Check if following lines should be included in List Item
              while (src) {
                rawLine = src.split('\n', 1)[0];
                line = rawLine;

                // Re-align to follow commonmark nesting rules
                if (this.options.pedantic) {
                  line = line.replace(/^ {1,4}(?=( {4})*[^ ])/g, '  ');
                }

                // End list item if found start of new bullet
                if (nextBulletRegex.test(line)) {
                  break;
                }

                // Horizontal rule found
                if (hrRegex.test(src)) {
                  break;
                }

                if (line.search(/[^ ]/) >= indent || !line.trim()) { // Dedent if possible
                  itemContents += '\n' + line.slice(indent);
                } else if (!blankLine) { // Until blank line, item doesn't need indentation
                  itemContents += '\n' + line;
                } else { // Otherwise, improper indentation ends this item
                  break;
                }

                if (!blankLine && !line.trim()) { // Check if current line is blank
                  blankLine = true;
                }

                raw += rawLine + '\n';
                src = src.substring(rawLine.length + 1);
              }
            }

            if (!list.loose) {
              // If the previous item ended with a blank line, the list is loose
              if (endsWithBlankLine) {
                list.loose = true;
              } else if (/\n *\n *$/.test(raw)) {
                endsWithBlankLine = true;
              }
            }

            // Check for task list items
            if (this.options.gfm) {
              istask = /^\[[ xX]\] /.exec(itemContents);
              if (istask) {
                ischecked = istask[0] !== '[ ] ';
                itemContents = itemContents.replace(/^\[[ xX]\] +/, '');
              }
            }

            list.items.push({
              type: 'list_item',
              raw,
              task: !!istask,
              checked: ischecked,
              loose: false,
              text: itemContents
            });

            list.raw += raw;
          }

          // Do not consume newlines at end of final item. Alternatively, make itemRegex *start* with any newlines to simplify/speed up endsWithBlankLine logic
          list.items[list.items.length - 1].raw = raw.trimRight();
          list.items[list.items.length - 1].text = itemContents.trimRight();
          list.raw = list.raw.trimRight();

          const l = list.items.length;

          // Item child tokens handled here at end because we needed to have the final item to trim it first
          for (i = 0; i < l; i++) {
            this.lexer.state.top = false;
            list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
            const spacers = list.items[i].tokens.filter(t => t.type === 'space');
            const hasMultipleLineBreaks = spacers.every(t => {
              const chars = t.raw.split('');
              let lineBreaks = 0;
              for (const char of chars) {
                if (char === '\n') {
                  lineBreaks += 1;
                }
                if (lineBreaks > 1) {
                  return true;
                }
              }

              return false;
            });

            if (!list.loose && spacers.length && hasMultipleLineBreaks) {
              // Having a single line break doesn't mean a list is loose. A single line break is terminating the last list item
              list.loose = true;
              list.items[i].loose = true;
            }
          }

          return list;
        }
      }

      html(src) {
        const cap = this.rules.block.html.exec(src);
        if (cap) {
          const token = {
            type: 'html',
            raw: cap[0],
            pre: !this.options.sanitizer
              && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
            text: cap[0]
          };
          if (this.options.sanitize) {
            token.type = 'paragraph';
            token.text = this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]);
            token.tokens = [];
            this.lexer.inline(token.text, token.tokens);
          }
          return token;
        }
      }

      def(src) {
        const cap = this.rules.block.def.exec(src);
        if (cap) {
          if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
          const tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
          return {
            type: 'def',
            tag,
            raw: cap[0],
            href: cap[2],
            title: cap[3]
          };
        }
      }

      table(src) {
        const cap = this.rules.block.table.exec(src);
        if (cap) {
          const item = {
            type: 'table',
            header: splitCells(cap[1]).map(c => { return { text: c }; }),
            align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
            rows: cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, '').split('\n') : []
          };

          if (item.header.length === item.align.length) {
            item.raw = cap[0];

            let l = item.align.length;
            let i, j, k, row;
            for (i = 0; i < l; i++) {
              if (/^ *-+: *$/.test(item.align[i])) {
                item.align[i] = 'right';
              } else if (/^ *:-+: *$/.test(item.align[i])) {
                item.align[i] = 'center';
              } else if (/^ *:-+ *$/.test(item.align[i])) {
                item.align[i] = 'left';
              } else {
                item.align[i] = null;
              }
            }

            l = item.rows.length;
            for (i = 0; i < l; i++) {
              item.rows[i] = splitCells(item.rows[i], item.header.length).map(c => { return { text: c }; });
            }

            // parse child tokens inside headers and cells

            // header child tokens
            l = item.header.length;
            for (j = 0; j < l; j++) {
              item.header[j].tokens = [];
              this.lexer.inlineTokens(item.header[j].text, item.header[j].tokens);
            }

            // cell child tokens
            l = item.rows.length;
            for (j = 0; j < l; j++) {
              row = item.rows[j];
              for (k = 0; k < row.length; k++) {
                row[k].tokens = [];
                this.lexer.inlineTokens(row[k].text, row[k].tokens);
              }
            }

            return item;
          }
        }
      }

      lheading(src) {
        const cap = this.rules.block.lheading.exec(src);
        if (cap) {
          const token = {
            type: 'heading',
            raw: cap[0],
            depth: cap[2].charAt(0) === '=' ? 1 : 2,
            text: cap[1],
            tokens: []
          };
          this.lexer.inline(token.text, token.tokens);
          return token;
        }
      }

      paragraph(src) {
        const cap = this.rules.block.paragraph.exec(src);
        if (cap) {
          const token = {
            type: 'paragraph',
            raw: cap[0],
            text: cap[1].charAt(cap[1].length - 1) === '\n'
              ? cap[1].slice(0, -1)
              : cap[1],
            tokens: []
          };
          this.lexer.inline(token.text, token.tokens);
          return token;
        }
      }

      text(src) {
        const cap = this.rules.block.text.exec(src);
        if (cap) {
          const token = {
            type: 'text',
            raw: cap[0],
            text: cap[0],
            tokens: []
          };
          this.lexer.inline(token.text, token.tokens);
          return token;
        }
      }

      escape(src) {
        const cap = this.rules.inline.escape.exec(src);
        if (cap) {
          return {
            type: 'escape',
            raw: cap[0],
            text: escape(cap[1])
          };
        }
      }

      tag(src) {
        const cap = this.rules.inline.tag.exec(src);
        if (cap) {
          if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
            this.lexer.state.inLink = true;
          } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
            this.lexer.state.inLink = false;
          }
          if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
            this.lexer.state.inRawBlock = true;
          } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
            this.lexer.state.inRawBlock = false;
          }

          return {
            type: this.options.sanitize
              ? 'text'
              : 'html',
            raw: cap[0],
            inLink: this.lexer.state.inLink,
            inRawBlock: this.lexer.state.inRawBlock,
            text: this.options.sanitize
              ? (this.options.sanitizer
                ? this.options.sanitizer(cap[0])
                : escape(cap[0]))
              : cap[0]
          };
        }
      }

      link(src) {
        const cap = this.rules.inline.link.exec(src);
        if (cap) {
          const trimmedUrl = cap[2].trim();
          if (!this.options.pedantic && /^</.test(trimmedUrl)) {
            // commonmark requires matching angle brackets
            if (!(/>$/.test(trimmedUrl))) {
              return;
            }

            // ending angle bracket cannot be escaped
            const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
            if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
              return;
            }
          } else {
            // find closing parenthesis
            const lastParenIndex = findClosingBracket(cap[2], '()');
            if (lastParenIndex > -1) {
              const start = cap[0].indexOf('!') === 0 ? 5 : 4;
              const linkLen = start + cap[1].length + lastParenIndex;
              cap[2] = cap[2].substring(0, lastParenIndex);
              cap[0] = cap[0].substring(0, linkLen).trim();
              cap[3] = '';
            }
          }
          let href = cap[2];
          let title = '';
          if (this.options.pedantic) {
            // split pedantic href and title
            const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

            if (link) {
              href = link[1];
              title = link[3];
            }
          } else {
            title = cap[3] ? cap[3].slice(1, -1) : '';
          }

          href = href.trim();
          if (/^</.test(href)) {
            if (this.options.pedantic && !(/>$/.test(trimmedUrl))) {
              // pedantic allows starting angle bracket without ending angle bracket
              href = href.slice(1);
            } else {
              href = href.slice(1, -1);
            }
          }
          return outputLink(cap, {
            href: href ? href.replace(this.rules.inline._escapes, '$1') : href,
            title: title ? title.replace(this.rules.inline._escapes, '$1') : title
          }, cap[0], this.lexer);
        }
      }

      reflink(src, links) {
        let cap;
        if ((cap = this.rules.inline.reflink.exec(src))
            || (cap = this.rules.inline.nolink.exec(src))) {
          let link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
          link = links[link.toLowerCase()];
          if (!link || !link.href) {
            const text = cap[0].charAt(0);
            return {
              type: 'text',
              raw: text,
              text
            };
          }
          return outputLink(cap, link, cap[0], this.lexer);
        }
      }

      emStrong(src, maskedSrc, prevChar = '') {
        let match = this.rules.inline.emStrong.lDelim.exec(src);
        if (!match) return;

        // _ can't be between two alphanumerics. \p{L}\p{N} includes non-english alphabet/numbers as well
        if (match[3] && prevChar.match(/[\p{L}\p{N}]/u)) return;

        const nextChar = match[1] || match[2] || '';

        if (!nextChar || (nextChar && (prevChar === '' || this.rules.inline.punctuation.exec(prevChar)))) {
          const lLength = match[0].length - 1;
          let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;

          const endReg = match[0][0] === '*' ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
          endReg.lastIndex = 0;

          // Clip maskedSrc to same section of string as src (move to lexer?)
          maskedSrc = maskedSrc.slice(-1 * src.length + lLength);

          while ((match = endReg.exec(maskedSrc)) != null) {
            rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];

            if (!rDelim) continue; // skip single * in __abc*abc__

            rLength = rDelim.length;

            if (match[3] || match[4]) { // found another Left Delim
              delimTotal += rLength;
              continue;
            } else if (match[5] || match[6]) { // either Left or Right Delim
              if (lLength % 3 && !((lLength + rLength) % 3)) {
                midDelimTotal += rLength;
                continue; // CommonMark Emphasis Rules 9-10
              }
            }

            delimTotal -= rLength;

            if (delimTotal > 0) continue; // Haven't found enough closing delimiters

            // Remove extra characters. *a*** -> *a*
            rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);

            // Create `em` if smallest delimiter has odd char count. *a***
            if (Math.min(lLength, rLength) % 2) {
              const text = src.slice(1, lLength + match.index + rLength);
              return {
                type: 'em',
                raw: src.slice(0, lLength + match.index + rLength + 1),
                text,
                tokens: this.lexer.inlineTokens(text, [])
              };
            }

            // Create 'strong' if smallest delimiter has even char count. **a***
            const text = src.slice(2, lLength + match.index + rLength - 1);
            return {
              type: 'strong',
              raw: src.slice(0, lLength + match.index + rLength + 1),
              text,
              tokens: this.lexer.inlineTokens(text, [])
            };
          }
        }
      }

      codespan(src) {
        const cap = this.rules.inline.code.exec(src);
        if (cap) {
          let text = cap[2].replace(/\n/g, ' ');
          const hasNonSpaceChars = /[^ ]/.test(text);
          const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
          if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
            text = text.substring(1, text.length - 1);
          }
          text = escape(text, true);
          return {
            type: 'codespan',
            raw: cap[0],
            text
          };
        }
      }

      br(src) {
        const cap = this.rules.inline.br.exec(src);
        if (cap) {
          return {
            type: 'br',
            raw: cap[0]
          };
        }
      }

      del(src) {
        const cap = this.rules.inline.del.exec(src);
        if (cap) {
          return {
            type: 'del',
            raw: cap[0],
            text: cap[2],
            tokens: this.lexer.inlineTokens(cap[2], [])
          };
        }
      }

      autolink(src, mangle) {
        const cap = this.rules.inline.autolink.exec(src);
        if (cap) {
          let text, href;
          if (cap[2] === '@') {
            text = escape(this.options.mangle ? mangle(cap[1]) : cap[1]);
            href = 'mailto:' + text;
          } else {
            text = escape(cap[1]);
            href = text;
          }

          return {
            type: 'link',
            raw: cap[0],
            text,
            href,
            tokens: [
              {
                type: 'text',
                raw: text,
                text
              }
            ]
          };
        }
      }

      url(src, mangle) {
        let cap;
        if (cap = this.rules.inline.url.exec(src)) {
          let text, href;
          if (cap[2] === '@') {
            text = escape(this.options.mangle ? mangle(cap[0]) : cap[0]);
            href = 'mailto:' + text;
          } else {
            // do extended autolink path validation
            let prevCapZero;
            do {
              prevCapZero = cap[0];
              cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
            } while (prevCapZero !== cap[0]);
            text = escape(cap[0]);
            if (cap[1] === 'www.') {
              href = 'http://' + text;
            } else {
              href = text;
            }
          }
          return {
            type: 'link',
            raw: cap[0],
            text,
            href,
            tokens: [
              {
                type: 'text',
                raw: text,
                text
              }
            ]
          };
        }
      }

      inlineText(src, smartypants) {
        const cap = this.rules.inline.text.exec(src);
        if (cap) {
          let text;
          if (this.lexer.state.inRawBlock) {
            text = this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0])) : cap[0];
          } else {
            text = escape(this.options.smartypants ? smartypants(cap[0]) : cap[0]);
          }
          return {
            type: 'text',
            raw: cap[0],
            text
          };
        }
      }
    }

    /**
     * Block-Level Grammar
     */
    const block = {
      newline: /^(?: *(?:\n|$))+/,
      code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
      fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
      hr: /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,
      heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
      blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
      list: /^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/,
      html: '^ {0,3}(?:' // optional indentation
        + '<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
        + '|comment[^\\n]*(\\n+|$)' // (2)
        + '|<\\?[\\s\\S]*?(?:\\?>\\n*|$)' // (3)
        + '|<![A-Z][\\s\\S]*?(?:>\\n*|$)' // (4)
        + '|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)' // (5)
        + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (6)
        + '|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) open tag
        + '|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)' // (7) closing tag
        + ')',
      def: /^ {0,3}\[(label)\]: *(?:\n *)?<?([^\s>]+)>?(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/,
      table: noopTest,
      lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
      // regex template, placeholders will be replaced according to different paragraph
      // interruption rules of commonmark and the original markdown spec:
      _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
      text: /^[^\n]+/
    };

    block._label = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
    block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
    block.def = edit(block.def)
      .replace('label', block._label)
      .replace('title', block._title)
      .getRegex();

    block.bullet = /(?:[*+-]|\d{1,9}[.)])/;
    block.listItemStart = edit(/^( *)(bull) */)
      .replace('bull', block.bullet)
      .getRegex();

    block.list = edit(block.list)
      .replace(/bull/g, block.bullet)
      .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
      .replace('def', '\\n+(?=' + block.def.source + ')')
      .getRegex();

    block._tag = 'address|article|aside|base|basefont|blockquote|body|caption'
      + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
      + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
      + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
      + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr'
      + '|track|ul';
    block._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
    block.html = edit(block.html, 'i')
      .replace('comment', block._comment)
      .replace('tag', block._tag)
      .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
      .getRegex();

    block.paragraph = edit(block._paragraph)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
      .replace('|table', '')
      .replace('blockquote', ' {0,3}>')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
      .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
      .getRegex();

    block.blockquote = edit(block.blockquote)
      .replace('paragraph', block.paragraph)
      .getRegex();

    /**
     * Normal Block Grammar
     */

    block.normal = merge({}, block);

    /**
     * GFM Block Grammar
     */

    block.gfm = merge({}, block.normal, {
      table: '^ *([^\\n ].*\\|.*)\\n' // Header
        + ' {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?' // Align
        + '(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)' // Cells
    });

    block.gfm.table = edit(block.gfm.table)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('blockquote', ' {0,3}>')
      .replace('code', ' {4}[^\\n]')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
      .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
      .getRegex();

    block.gfm.paragraph = edit(block._paragraph)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
      .replace('table', block.gfm.table) // interrupt paragraphs with table
      .replace('blockquote', ' {0,3}>')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
      .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
      .getRegex();
    /**
     * Pedantic grammar (original John Gruber's loose markdown specification)
     */

    block.pedantic = merge({}, block.normal, {
      html: edit(
        '^ *(?:comment *(?:\\n|\\s*$)'
        + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
        + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
        .replace('comment', block._comment)
        .replace(/tag/g, '(?!(?:'
          + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
          + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
          + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
        .getRegex(),
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
      heading: /^(#{1,6})(.*)(?:\n+|$)/,
      fences: noopTest, // fences not supported
      paragraph: edit(block.normal._paragraph)
        .replace('hr', block.hr)
        .replace('heading', ' *#{1,6} *[^\n]')
        .replace('lheading', block.lheading)
        .replace('blockquote', ' {0,3}>')
        .replace('|fences', '')
        .replace('|list', '')
        .replace('|html', '')
        .getRegex()
    });

    /**
     * Inline-Level Grammar
     */
    const inline = {
      escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
      autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
      url: noopTest,
      tag: '^comment'
        + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
        + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
        + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
        + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
        + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>', // CDATA section
      link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
      reflink: /^!?\[(label)\]\[(ref)\]/,
      nolink: /^!?\[(ref)\](?:\[\])?/,
      reflinkSearch: 'reflink|nolink(?!\\()',
      emStrong: {
        lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
        //        (1) and (2) can only be a Right Delimiter. (3) and (4) can only be Left.  (5) and (6) can be either Left or Right.
        //          () Skip orphan inside strong  () Consume to delim (1) #***                (2) a***#, a***                   (3) #***a, ***a                 (4) ***#              (5) #***#                 (6) a***a
        rDelimAst: /^[^_*]*?\_\_[^_*]*?\*[^_*]*?(?=\_\_)|[^*]+(?=[^*])|[punct_](\*+)(?=[\s]|$)|[^punct*_\s](\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|[^punct*_\s](\*+)(?=[^punct*_\s])/,
        rDelimUnd: /^[^_*]*?\*\*[^_*]*?\_[^_*]*?(?=\*\*)|[^_]+(?=[^_])|[punct*](\_+)(?=[\s]|$)|[^punct*_\s](\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/ // ^- Not allowed for _
      },
      code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
      br: /^( {2,}|\\)\n(?!\s*$)/,
      del: noopTest,
      text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
      punctuation: /^([\spunctuation])/
    };

    // list of punctuation marks from CommonMark spec
    // without * and _ to handle the different emphasis markers * and _
    inline._punctuation = '!"#$%&\'()+\\-.,/:;<=>?@\\[\\]`^{|}~';
    inline.punctuation = edit(inline.punctuation).replace(/punctuation/g, inline._punctuation).getRegex();

    // sequences em should skip over [title](link), `code`, <html>
    inline.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g;
    inline.escapedEmSt = /\\\*|\\_/g;

    inline._comment = edit(block._comment).replace('(?:-->|$)', '-->').getRegex();

    inline.emStrong.lDelim = edit(inline.emStrong.lDelim)
      .replace(/punct/g, inline._punctuation)
      .getRegex();

    inline.emStrong.rDelimAst = edit(inline.emStrong.rDelimAst, 'g')
      .replace(/punct/g, inline._punctuation)
      .getRegex();

    inline.emStrong.rDelimUnd = edit(inline.emStrong.rDelimUnd, 'g')
      .replace(/punct/g, inline._punctuation)
      .getRegex();

    inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

    inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
    inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
    inline.autolink = edit(inline.autolink)
      .replace('scheme', inline._scheme)
      .replace('email', inline._email)
      .getRegex();

    inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

    inline.tag = edit(inline.tag)
      .replace('comment', inline._comment)
      .replace('attribute', inline._attribute)
      .getRegex();

    inline._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
    inline._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
    inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

    inline.link = edit(inline.link)
      .replace('label', inline._label)
      .replace('href', inline._href)
      .replace('title', inline._title)
      .getRegex();

    inline.reflink = edit(inline.reflink)
      .replace('label', inline._label)
      .replace('ref', block._label)
      .getRegex();

    inline.nolink = edit(inline.nolink)
      .replace('ref', block._label)
      .getRegex();

    inline.reflinkSearch = edit(inline.reflinkSearch, 'g')
      .replace('reflink', inline.reflink)
      .replace('nolink', inline.nolink)
      .getRegex();

    /**
     * Normal Inline Grammar
     */

    inline.normal = merge({}, inline);

    /**
     * Pedantic Inline Grammar
     */

    inline.pedantic = merge({}, inline.normal, {
      strong: {
        start: /^__|\*\*/,
        middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        endAst: /\*\*(?!\*)/g,
        endUnd: /__(?!_)/g
      },
      em: {
        start: /^_|\*/,
        middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
        endAst: /\*(?!\*)/g,
        endUnd: /_(?!_)/g
      },
      link: edit(/^!?\[(label)\]\((.*?)\)/)
        .replace('label', inline._label)
        .getRegex(),
      reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
        .replace('label', inline._label)
        .getRegex()
    });

    /**
     * GFM Inline Grammar
     */

    inline.gfm = merge({}, inline.normal, {
      escape: edit(inline.escape).replace('])', '~|])').getRegex(),
      _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
      url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
      _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
      del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
      text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
    });

    inline.gfm.url = edit(inline.gfm.url, 'i')
      .replace('email', inline.gfm._extended_email)
      .getRegex();
    /**
     * GFM + Line Breaks Inline Grammar
     */

    inline.breaks = merge({}, inline.gfm, {
      br: edit(inline.br).replace('{2,}', '*').getRegex(),
      text: edit(inline.gfm.text)
        .replace('\\b_', '\\b_| {2,}\\n')
        .replace(/\{2,\}/g, '*')
        .getRegex()
    });

    /**
     * smartypants text replacement
     * @param {string} text
     */
    function smartypants(text) {
      return text
        // em-dashes
        .replace(/---/g, '\u2014')
        // en-dashes
        .replace(/--/g, '\u2013')
        // opening singles
        .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
        // closing singles & apostrophes
        .replace(/'/g, '\u2019')
        // opening doubles
        .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
        // closing doubles
        .replace(/"/g, '\u201d')
        // ellipses
        .replace(/\.{3}/g, '\u2026');
    }

    /**
     * mangle email addresses
     * @param {string} text
     */
    function mangle(text) {
      let out = '',
        i,
        ch;

      const l = text.length;
      for (i = 0; i < l; i++) {
        ch = text.charCodeAt(i);
        if (Math.random() > 0.5) {
          ch = 'x' + ch.toString(16);
        }
        out += '&#' + ch + ';';
      }

      return out;
    }

    /**
     * Block Lexer
     */
    class Lexer {
      constructor(options) {
        this.tokens = [];
        this.tokens.links = Object.create(null);
        this.options = options || defaults;
        this.options.tokenizer = this.options.tokenizer || new Tokenizer();
        this.tokenizer = this.options.tokenizer;
        this.tokenizer.options = this.options;
        this.tokenizer.lexer = this;
        this.inlineQueue = [];
        this.state = {
          inLink: false,
          inRawBlock: false,
          top: true
        };

        const rules = {
          block: block.normal,
          inline: inline.normal
        };

        if (this.options.pedantic) {
          rules.block = block.pedantic;
          rules.inline = inline.pedantic;
        } else if (this.options.gfm) {
          rules.block = block.gfm;
          if (this.options.breaks) {
            rules.inline = inline.breaks;
          } else {
            rules.inline = inline.gfm;
          }
        }
        this.tokenizer.rules = rules;
      }

      /**
       * Expose Rules
       */
      static get rules() {
        return {
          block,
          inline
        };
      }

      /**
       * Static Lex Method
       */
      static lex(src, options) {
        const lexer = new Lexer(options);
        return lexer.lex(src);
      }

      /**
       * Static Lex Inline Method
       */
      static lexInline(src, options) {
        const lexer = new Lexer(options);
        return lexer.inlineTokens(src);
      }

      /**
       * Preprocessing
       */
      lex(src) {
        src = src
          .replace(/\r\n|\r/g, '\n');

        this.blockTokens(src, this.tokens);

        let next;
        while (next = this.inlineQueue.shift()) {
          this.inlineTokens(next.src, next.tokens);
        }

        return this.tokens;
      }

      /**
       * Lexing
       */
      blockTokens(src, tokens = []) {
        if (this.options.pedantic) {
          src = src.replace(/\t/g, '    ').replace(/^ +$/gm, '');
        } else {
          src = src.replace(/^( *)(\t+)/gm, (_, leading, tabs) => {
            return leading + '    '.repeat(tabs.length);
          });
        }

        let token, lastToken, cutSrc, lastParagraphClipped;

        while (src) {
          if (this.options.extensions
            && this.options.extensions.block
            && this.options.extensions.block.some((extTokenizer) => {
              if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                return true;
              }
              return false;
            })) {
            continue;
          }

          // newline
          if (token = this.tokenizer.space(src)) {
            src = src.substring(token.raw.length);
            if (token.raw.length === 1 && tokens.length > 0) {
              // if there's a single \n as a spacer, it's terminating the last line,
              // so move it there so that we don't get unecessary paragraph tags
              tokens[tokens.length - 1].raw += '\n';
            } else {
              tokens.push(token);
            }
            continue;
          }

          // code
          if (token = this.tokenizer.code(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            // An indented code block cannot interrupt a paragraph.
            if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
              lastToken.raw += '\n' + token.raw;
              lastToken.text += '\n' + token.text;
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          // fences
          if (token = this.tokenizer.fences(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // heading
          if (token = this.tokenizer.heading(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // hr
          if (token = this.tokenizer.hr(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // blockquote
          if (token = this.tokenizer.blockquote(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // list
          if (token = this.tokenizer.list(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // html
          if (token = this.tokenizer.html(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // def
          if (token = this.tokenizer.def(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
              lastToken.raw += '\n' + token.raw;
              lastToken.text += '\n' + token.raw;
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else if (!this.tokens.links[token.tag]) {
              this.tokens.links[token.tag] = {
                href: token.href,
                title: token.title
              };
            }
            continue;
          }

          // table (gfm)
          if (token = this.tokenizer.table(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // lheading
          if (token = this.tokenizer.lheading(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // top-level paragraph
          // prevent paragraph consuming extensions by clipping 'src' to extension start
          cutSrc = src;
          if (this.options.extensions && this.options.extensions.startBlock) {
            let startIndex = Infinity;
            const tempSrc = src.slice(1);
            let tempStart;
            this.options.extensions.startBlock.forEach(function(getStartIndex) {
              tempStart = getStartIndex.call({ lexer: this }, tempSrc);
              if (typeof tempStart === 'number' && tempStart >= 0) { startIndex = Math.min(startIndex, tempStart); }
            });
            if (startIndex < Infinity && startIndex >= 0) {
              cutSrc = src.substring(0, startIndex + 1);
            }
          }
          if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
            lastToken = tokens[tokens.length - 1];
            if (lastParagraphClipped && lastToken.type === 'paragraph') {
              lastToken.raw += '\n' + token.raw;
              lastToken.text += '\n' + token.text;
              this.inlineQueue.pop();
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            lastParagraphClipped = (cutSrc.length !== src.length);
            src = src.substring(token.raw.length);
            continue;
          }

          // text
          if (token = this.tokenizer.text(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === 'text') {
              lastToken.raw += '\n' + token.raw;
              lastToken.text += '\n' + token.text;
              this.inlineQueue.pop();
              this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          if (src) {
            const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
            if (this.options.silent) {
              console.error(errMsg);
              break;
            } else {
              throw new Error(errMsg);
            }
          }
        }

        this.state.top = true;
        return tokens;
      }

      inline(src, tokens) {
        this.inlineQueue.push({ src, tokens });
      }

      /**
       * Lexing/Compiling
       */
      inlineTokens(src, tokens = []) {
        let token, lastToken, cutSrc;

        // String with links masked to avoid interference with em and strong
        let maskedSrc = src;
        let match;
        let keepPrevChar, prevChar;

        // Mask out reflinks
        if (this.tokens.links) {
          const links = Object.keys(this.tokens.links);
          if (links.length > 0) {
            while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
              if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
                maskedSrc = maskedSrc.slice(0, match.index) + '[' + repeatString('a', match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
              }
            }
          }
        }
        // Mask out other blocks
        while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
          maskedSrc = maskedSrc.slice(0, match.index) + '[' + repeatString('a', match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
        }

        // Mask out escaped em & strong delimiters
        while ((match = this.tokenizer.rules.inline.escapedEmSt.exec(maskedSrc)) != null) {
          maskedSrc = maskedSrc.slice(0, match.index) + '++' + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
        }

        while (src) {
          if (!keepPrevChar) {
            prevChar = '';
          }
          keepPrevChar = false;

          // extensions
          if (this.options.extensions
            && this.options.extensions.inline
            && this.options.extensions.inline.some((extTokenizer) => {
              if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
                src = src.substring(token.raw.length);
                tokens.push(token);
                return true;
              }
              return false;
            })) {
            continue;
          }

          // escape
          if (token = this.tokenizer.escape(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // tag
          if (token = this.tokenizer.tag(src)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && token.type === 'text' && lastToken.type === 'text') {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          // link
          if (token = this.tokenizer.link(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // reflink, nolink
          if (token = this.tokenizer.reflink(src, this.tokens.links)) {
            src = src.substring(token.raw.length);
            lastToken = tokens[tokens.length - 1];
            if (lastToken && token.type === 'text' && lastToken.type === 'text') {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          // em & strong
          if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // code
          if (token = this.tokenizer.codespan(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // br
          if (token = this.tokenizer.br(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // del (gfm)
          if (token = this.tokenizer.del(src)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // autolink
          if (token = this.tokenizer.autolink(src, mangle)) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // url (gfm)
          if (!this.state.inLink && (token = this.tokenizer.url(src, mangle))) {
            src = src.substring(token.raw.length);
            tokens.push(token);
            continue;
          }

          // text
          // prevent inlineText consuming extensions by clipping 'src' to extension start
          cutSrc = src;
          if (this.options.extensions && this.options.extensions.startInline) {
            let startIndex = Infinity;
            const tempSrc = src.slice(1);
            let tempStart;
            this.options.extensions.startInline.forEach(function(getStartIndex) {
              tempStart = getStartIndex.call({ lexer: this }, tempSrc);
              if (typeof tempStart === 'number' && tempStart >= 0) { startIndex = Math.min(startIndex, tempStart); }
            });
            if (startIndex < Infinity && startIndex >= 0) {
              cutSrc = src.substring(0, startIndex + 1);
            }
          }
          if (token = this.tokenizer.inlineText(cutSrc, smartypants)) {
            src = src.substring(token.raw.length);
            if (token.raw.slice(-1) !== '_') { // Track prevChar before string of ____ started
              prevChar = token.raw.slice(-1);
            }
            keepPrevChar = true;
            lastToken = tokens[tokens.length - 1];
            if (lastToken && lastToken.type === 'text') {
              lastToken.raw += token.raw;
              lastToken.text += token.text;
            } else {
              tokens.push(token);
            }
            continue;
          }

          if (src) {
            const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
            if (this.options.silent) {
              console.error(errMsg);
              break;
            } else {
              throw new Error(errMsg);
            }
          }
        }

        return tokens;
      }
    }

    /**
     * Renderer
     */
    class Renderer {
      constructor(options) {
        this.options = options || defaults;
      }

      code(code, infostring, escaped) {
        const lang = (infostring || '').match(/\S*/)[0];
        if (this.options.highlight) {
          const out = this.options.highlight(code, lang);
          if (out != null && out !== code) {
            escaped = true;
            code = out;
          }
        }

        code = code.replace(/\n$/, '') + '\n';

        if (!lang) {
          return '<pre><code>'
            + (escaped ? code : escape(code, true))
            + '</code></pre>\n';
        }

        return '<pre><code class="'
          + this.options.langPrefix
          + escape(lang, true)
          + '">'
          + (escaped ? code : escape(code, true))
          + '</code></pre>\n';
      }

      /**
       * @param {string} quote
       */
      blockquote(quote) {
        return `<blockquote>\n${quote}</blockquote>\n`;
      }

      html(html) {
        return html;
      }

      /**
       * @param {string} text
       * @param {string} level
       * @param {string} raw
       * @param {any} slugger
       */
      heading(text, level, raw, slugger) {
        if (this.options.headerIds) {
          const id = this.options.headerPrefix + slugger.slug(raw);
          return `<h${level} id="${id}">${text}</h${level}>\n`;
        }

        // ignore IDs
        return `<h${level}>${text}</h${level}>\n`;
      }

      hr() {
        return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
      }

      list(body, ordered, start) {
        const type = ordered ? 'ol' : 'ul',
          startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
        return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
      }

      /**
       * @param {string} text
       */
      listitem(text) {
        return `<li>${text}</li>\n`;
      }

      checkbox(checked) {
        return '<input '
          + (checked ? 'checked="" ' : '')
          + 'disabled="" type="checkbox"'
          + (this.options.xhtml ? ' /' : '')
          + '> ';
      }

      /**
       * @param {string} text
       */
      paragraph(text) {
        return `<p>${text}</p>\n`;
      }

      /**
       * @param {string} header
       * @param {string} body
       */
      table(header, body) {
        if (body) body = `<tbody>${body}</tbody>`;

        return '<table>\n'
          + '<thead>\n'
          + header
          + '</thead>\n'
          + body
          + '</table>\n';
      }

      /**
       * @param {string} content
       */
      tablerow(content) {
        return `<tr>\n${content}</tr>\n`;
      }

      tablecell(content, flags) {
        const type = flags.header ? 'th' : 'td';
        const tag = flags.align
          ? `<${type} align="${flags.align}">`
          : `<${type}>`;
        return tag + content + `</${type}>\n`;
      }

      /**
       * span level renderer
       * @param {string} text
       */
      strong(text) {
        return `<strong>${text}</strong>`;
      }

      /**
       * @param {string} text
       */
      em(text) {
        return `<em>${text}</em>`;
      }

      /**
       * @param {string} text
       */
      codespan(text) {
        return `<code>${text}</code>`;
      }

      br() {
        return this.options.xhtml ? '<br/>' : '<br>';
      }

      /**
       * @param {string} text
       */
      del(text) {
        return `<del>${text}</del>`;
      }

      /**
       * @param {string} href
       * @param {string} title
       * @param {string} text
       */
      link(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        let out = '<a href="' + escape(href) + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += '>' + text + '</a>';
        return out;
      }

      /**
       * @param {string} href
       * @param {string} title
       * @param {string} text
       */
      image(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }

        let out = `<img src="${href}" alt="${text}"`;
        if (title) {
          out += ` title="${title}"`;
        }
        out += this.options.xhtml ? '/>' : '>';
        return out;
      }

      text(text) {
        return text;
      }
    }

    /**
     * TextRenderer
     * returns only the textual part of the token
     */
    class TextRenderer {
      // no need for block level renderers
      strong(text) {
        return text;
      }

      em(text) {
        return text;
      }

      codespan(text) {
        return text;
      }

      del(text) {
        return text;
      }

      html(text) {
        return text;
      }

      text(text) {
        return text;
      }

      link(href, title, text) {
        return '' + text;
      }

      image(href, title, text) {
        return '' + text;
      }

      br() {
        return '';
      }
    }

    /**
     * Slugger generates header id
     */
    class Slugger {
      constructor() {
        this.seen = {};
      }

      /**
       * @param {string} value
       */
      serialize(value) {
        return value
          .toLowerCase()
          .trim()
          // remove html tags
          .replace(/<[!\/a-z].*?>/ig, '')
          // remove unwanted chars
          .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
          .replace(/\s/g, '-');
      }

      /**
       * Finds the next safe (unique) slug to use
       * @param {string} originalSlug
       * @param {boolean} isDryRun
       */
      getNextSafeSlug(originalSlug, isDryRun) {
        let slug = originalSlug;
        let occurenceAccumulator = 0;
        if (this.seen.hasOwnProperty(slug)) {
          occurenceAccumulator = this.seen[originalSlug];
          do {
            occurenceAccumulator++;
            slug = originalSlug + '-' + occurenceAccumulator;
          } while (this.seen.hasOwnProperty(slug));
        }
        if (!isDryRun) {
          this.seen[originalSlug] = occurenceAccumulator;
          this.seen[slug] = 0;
        }
        return slug;
      }

      /**
       * Convert string to unique id
       * @param {object} [options]
       * @param {boolean} [options.dryrun] Generates the next unique slug without
       * updating the internal accumulator.
       */
      slug(value, options = {}) {
        const slug = this.serialize(value);
        return this.getNextSafeSlug(slug, options.dryrun);
      }
    }

    /**
     * Parsing & Compiling
     */
    class Parser {
      constructor(options) {
        this.options = options || defaults;
        this.options.renderer = this.options.renderer || new Renderer();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;
        this.textRenderer = new TextRenderer();
        this.slugger = new Slugger();
      }

      /**
       * Static Parse Method
       */
      static parse(tokens, options) {
        const parser = new Parser(options);
        return parser.parse(tokens);
      }

      /**
       * Static Parse Inline Method
       */
      static parseInline(tokens, options) {
        const parser = new Parser(options);
        return parser.parseInline(tokens);
      }

      /**
       * Parse Loop
       */
      parse(tokens, top = true) {
        let out = '',
          i,
          j,
          k,
          l2,
          l3,
          row,
          cell,
          header,
          body,
          token,
          ordered,
          start,
          loose,
          itemBody,
          item,
          checked,
          task,
          checkbox,
          ret;

        const l = tokens.length;
        for (i = 0; i < l; i++) {
          token = tokens[i];

          // Run any renderer extensions
          if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
            ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
            if (ret !== false || !['space', 'hr', 'heading', 'code', 'table', 'blockquote', 'list', 'html', 'paragraph', 'text'].includes(token.type)) {
              out += ret || '';
              continue;
            }
          }

          switch (token.type) {
            case 'space': {
              continue;
            }
            case 'hr': {
              out += this.renderer.hr();
              continue;
            }
            case 'heading': {
              out += this.renderer.heading(
                this.parseInline(token.tokens),
                token.depth,
                unescape(this.parseInline(token.tokens, this.textRenderer)),
                this.slugger);
              continue;
            }
            case 'code': {
              out += this.renderer.code(token.text,
                token.lang,
                token.escaped);
              continue;
            }
            case 'table': {
              header = '';

              // header
              cell = '';
              l2 = token.header.length;
              for (j = 0; j < l2; j++) {
                cell += this.renderer.tablecell(
                  this.parseInline(token.header[j].tokens),
                  { header: true, align: token.align[j] }
                );
              }
              header += this.renderer.tablerow(cell);

              body = '';
              l2 = token.rows.length;
              for (j = 0; j < l2; j++) {
                row = token.rows[j];

                cell = '';
                l3 = row.length;
                for (k = 0; k < l3; k++) {
                  cell += this.renderer.tablecell(
                    this.parseInline(row[k].tokens),
                    { header: false, align: token.align[k] }
                  );
                }

                body += this.renderer.tablerow(cell);
              }
              out += this.renderer.table(header, body);
              continue;
            }
            case 'blockquote': {
              body = this.parse(token.tokens);
              out += this.renderer.blockquote(body);
              continue;
            }
            case 'list': {
              ordered = token.ordered;
              start = token.start;
              loose = token.loose;
              l2 = token.items.length;

              body = '';
              for (j = 0; j < l2; j++) {
                item = token.items[j];
                checked = item.checked;
                task = item.task;

                itemBody = '';
                if (item.task) {
                  checkbox = this.renderer.checkbox(checked);
                  if (loose) {
                    if (item.tokens.length > 0 && item.tokens[0].type === 'paragraph') {
                      item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
                      if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                        item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
                      }
                    } else {
                      item.tokens.unshift({
                        type: 'text',
                        text: checkbox
                      });
                    }
                  } else {
                    itemBody += checkbox;
                  }
                }

                itemBody += this.parse(item.tokens, loose);
                body += this.renderer.listitem(itemBody, task, checked);
              }

              out += this.renderer.list(body, ordered, start);
              continue;
            }
            case 'html': {
              // TODO parse inline content if parameter markdown=1
              out += this.renderer.html(token.text);
              continue;
            }
            case 'paragraph': {
              out += this.renderer.paragraph(this.parseInline(token.tokens));
              continue;
            }
            case 'text': {
              body = token.tokens ? this.parseInline(token.tokens) : token.text;
              while (i + 1 < l && tokens[i + 1].type === 'text') {
                token = tokens[++i];
                body += '\n' + (token.tokens ? this.parseInline(token.tokens) : token.text);
              }
              out += top ? this.renderer.paragraph(body) : body;
              continue;
            }

            default: {
              const errMsg = 'Token with "' + token.type + '" type was not found.';
              if (this.options.silent) {
                console.error(errMsg);
                return;
              } else {
                throw new Error(errMsg);
              }
            }
          }
        }

        return out;
      }

      /**
       * Parse Inline Tokens
       */
      parseInline(tokens, renderer) {
        renderer = renderer || this.renderer;
        let out = '',
          i,
          token,
          ret;

        const l = tokens.length;
        for (i = 0; i < l; i++) {
          token = tokens[i];

          // Run any renderer extensions
          if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
            ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
            if (ret !== false || !['escape', 'html', 'link', 'image', 'strong', 'em', 'codespan', 'br', 'del', 'text'].includes(token.type)) {
              out += ret || '';
              continue;
            }
          }

          switch (token.type) {
            case 'escape': {
              out += renderer.text(token.text);
              break;
            }
            case 'html': {
              out += renderer.html(token.text);
              break;
            }
            case 'link': {
              out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
              break;
            }
            case 'image': {
              out += renderer.image(token.href, token.title, token.text);
              break;
            }
            case 'strong': {
              out += renderer.strong(this.parseInline(token.tokens, renderer));
              break;
            }
            case 'em': {
              out += renderer.em(this.parseInline(token.tokens, renderer));
              break;
            }
            case 'codespan': {
              out += renderer.codespan(token.text);
              break;
            }
            case 'br': {
              out += renderer.br();
              break;
            }
            case 'del': {
              out += renderer.del(this.parseInline(token.tokens, renderer));
              break;
            }
            case 'text': {
              out += renderer.text(token.text);
              break;
            }
            default: {
              const errMsg = 'Token with "' + token.type + '" type was not found.';
              if (this.options.silent) {
                console.error(errMsg);
                return;
              } else {
                throw new Error(errMsg);
              }
            }
          }
        }
        return out;
      }
    }

    /**
     * Marked
     */
    function marked(src, opt, callback) {
      // throw error in case of non string input
      if (typeof src === 'undefined' || src === null) {
        throw new Error('marked(): input parameter is undefined or null');
      }
      if (typeof src !== 'string') {
        throw new Error('marked(): input parameter is of type '
          + Object.prototype.toString.call(src) + ', string expected');
      }

      if (typeof opt === 'function') {
        callback = opt;
        opt = null;
      }

      opt = merge({}, marked.defaults, opt || {});
      checkSanitizeDeprecation(opt);

      if (callback) {
        const highlight = opt.highlight;
        let tokens;

        try {
          tokens = Lexer.lex(src, opt);
        } catch (e) {
          return callback(e);
        }

        const done = function(err) {
          let out;

          if (!err) {
            try {
              if (opt.walkTokens) {
                marked.walkTokens(tokens, opt.walkTokens);
              }
              out = Parser.parse(tokens, opt);
            } catch (e) {
              err = e;
            }
          }

          opt.highlight = highlight;

          return err
            ? callback(err)
            : callback(null, out);
        };

        if (!highlight || highlight.length < 3) {
          return done();
        }

        delete opt.highlight;

        if (!tokens.length) return done();

        let pending = 0;
        marked.walkTokens(tokens, function(token) {
          if (token.type === 'code') {
            pending++;
            setTimeout(() => {
              highlight(token.text, token.lang, function(err, code) {
                if (err) {
                  return done(err);
                }
                if (code != null && code !== token.text) {
                  token.text = code;
                  token.escaped = true;
                }

                pending--;
                if (pending === 0) {
                  done();
                }
              });
            }, 0);
          }
        });

        if (pending === 0) {
          done();
        }

        return;
      }

      try {
        const tokens = Lexer.lex(src, opt);
        if (opt.walkTokens) {
          marked.walkTokens(tokens, opt.walkTokens);
        }
        return Parser.parse(tokens, opt);
      } catch (e) {
        e.message += '\nPlease report this to https://github.com/markedjs/marked.';
        if (opt.silent) {
          return '<p>An error occurred:</p><pre>'
            + escape(e.message + '', true)
            + '</pre>';
        }
        throw e;
      }
    }

    /**
     * Options
     */

    marked.options =
    marked.setOptions = function(opt) {
      merge(marked.defaults, opt);
      changeDefaults(marked.defaults);
      return marked;
    };

    marked.getDefaults = getDefaults;

    marked.defaults = defaults;

    /**
     * Use Extension
     */

    marked.use = function(...args) {
      const opts = merge({}, ...args);
      const extensions = marked.defaults.extensions || { renderers: {}, childTokens: {} };
      let hasExtensions;

      args.forEach((pack) => {
        // ==-- Parse "addon" extensions --== //
        if (pack.extensions) {
          hasExtensions = true;
          pack.extensions.forEach((ext) => {
            if (!ext.name) {
              throw new Error('extension name required');
            }
            if (ext.renderer) { // Renderer extensions
              const prevRenderer = extensions.renderers ? extensions.renderers[ext.name] : null;
              if (prevRenderer) {
                // Replace extension with func to run new extension but fall back if false
                extensions.renderers[ext.name] = function(...args) {
                  let ret = ext.renderer.apply(this, args);
                  if (ret === false) {
                    ret = prevRenderer.apply(this, args);
                  }
                  return ret;
                };
              } else {
                extensions.renderers[ext.name] = ext.renderer;
              }
            }
            if (ext.tokenizer) { // Tokenizer Extensions
              if (!ext.level || (ext.level !== 'block' && ext.level !== 'inline')) {
                throw new Error("extension level must be 'block' or 'inline'");
              }
              if (extensions[ext.level]) {
                extensions[ext.level].unshift(ext.tokenizer);
              } else {
                extensions[ext.level] = [ext.tokenizer];
              }
              if (ext.start) { // Function to check for start of token
                if (ext.level === 'block') {
                  if (extensions.startBlock) {
                    extensions.startBlock.push(ext.start);
                  } else {
                    extensions.startBlock = [ext.start];
                  }
                } else if (ext.level === 'inline') {
                  if (extensions.startInline) {
                    extensions.startInline.push(ext.start);
                  } else {
                    extensions.startInline = [ext.start];
                  }
                }
              }
            }
            if (ext.childTokens) { // Child tokens to be visited by walkTokens
              extensions.childTokens[ext.name] = ext.childTokens;
            }
          });
        }

        // ==-- Parse "overwrite" extensions --== //
        if (pack.renderer) {
          const renderer = marked.defaults.renderer || new Renderer();
          for (const prop in pack.renderer) {
            const prevRenderer = renderer[prop];
            // Replace renderer with func to run extension, but fall back if false
            renderer[prop] = (...args) => {
              let ret = pack.renderer[prop].apply(renderer, args);
              if (ret === false) {
                ret = prevRenderer.apply(renderer, args);
              }
              return ret;
            };
          }
          opts.renderer = renderer;
        }
        if (pack.tokenizer) {
          const tokenizer = marked.defaults.tokenizer || new Tokenizer();
          for (const prop in pack.tokenizer) {
            const prevTokenizer = tokenizer[prop];
            // Replace tokenizer with func to run extension, but fall back if false
            tokenizer[prop] = (...args) => {
              let ret = pack.tokenizer[prop].apply(tokenizer, args);
              if (ret === false) {
                ret = prevTokenizer.apply(tokenizer, args);
              }
              return ret;
            };
          }
          opts.tokenizer = tokenizer;
        }

        // ==-- Parse WalkTokens extensions --== //
        if (pack.walkTokens) {
          const walkTokens = marked.defaults.walkTokens;
          opts.walkTokens = function(token) {
            pack.walkTokens.call(this, token);
            if (walkTokens) {
              walkTokens.call(this, token);
            }
          };
        }

        if (hasExtensions) {
          opts.extensions = extensions;
        }

        marked.setOptions(opts);
      });
    };

    /**
     * Run callback for every token
     */

    marked.walkTokens = function(tokens, callback) {
      for (const token of tokens) {
        callback.call(marked, token);
        switch (token.type) {
          case 'table': {
            for (const cell of token.header) {
              marked.walkTokens(cell.tokens, callback);
            }
            for (const row of token.rows) {
              for (const cell of row) {
                marked.walkTokens(cell.tokens, callback);
              }
            }
            break;
          }
          case 'list': {
            marked.walkTokens(token.items, callback);
            break;
          }
          default: {
            if (marked.defaults.extensions && marked.defaults.extensions.childTokens && marked.defaults.extensions.childTokens[token.type]) { // Walk any extensions
              marked.defaults.extensions.childTokens[token.type].forEach(function(childTokens) {
                marked.walkTokens(token[childTokens], callback);
              });
            } else if (token.tokens) {
              marked.walkTokens(token.tokens, callback);
            }
          }
        }
      }
    };

    /**
     * Parse Inline
     * @param {string} src
     */
    marked.parseInline = function(src, opt) {
      // throw error in case of non string input
      if (typeof src === 'undefined' || src === null) {
        throw new Error('marked.parseInline(): input parameter is undefined or null');
      }
      if (typeof src !== 'string') {
        throw new Error('marked.parseInline(): input parameter is of type '
          + Object.prototype.toString.call(src) + ', string expected');
      }

      opt = merge({}, marked.defaults, opt || {});
      checkSanitizeDeprecation(opt);

      try {
        const tokens = Lexer.lexInline(src, opt);
        if (opt.walkTokens) {
          marked.walkTokens(tokens, opt.walkTokens);
        }
        return Parser.parseInline(tokens, opt);
      } catch (e) {
        e.message += '\nPlease report this to https://github.com/markedjs/marked.';
        if (opt.silent) {
          return '<p>An error occurred:</p><pre>'
            + escape(e.message + '', true)
            + '</pre>';
        }
        throw e;
      }
    };

    /**
     * Expose
     */
    marked.Parser = Parser;
    marked.parser = Parser.parse;
    marked.Renderer = Renderer;
    marked.TextRenderer = TextRenderer;
    marked.Lexer = Lexer;
    marked.lexer = Lexer.lex;
    marked.Tokenizer = Tokenizer;
    marked.Slugger = Slugger;
    marked.parse = marked;
    Parser.parse;
    Lexer.lex;

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\shared\markdown.svelte generated by Svelte v3.48.0 */
    const file$4 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\shared\\markdown.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let raw_value = /*_marked*/ ctx[1](/*source*/ ctx[0]) + "";

    	const block = {
    		c: function create() {
    			div = element("div");
    			this.c = noop;
    			attr_dev(div, "class", "markdown");
    			add_location(div, file$4, 7, 0, 164);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = raw_value;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*source*/ 1 && raw_value !== (raw_value = /*_marked*/ ctx[1](/*source*/ ctx[0]) + "")) div.innerHTML = raw_value;		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-markdown', slots, []);
    	let _marked = marked;
    	let { source = "" } = $$props;
    	const writable_props = ['source'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-markdown> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('source' in $$props) $$invalidate(0, source = $$props.source);
    	};

    	$$self.$capture_state = () => ({ marked, _marked, source });

    	$$self.$inject_state = $$props => {
    		if ('_marked' in $$props) $$invalidate(1, _marked = $$props._marked);
    		if ('source' in $$props) $$invalidate(0, source = $$props.source);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [source, _marked];
    }

    class Markdown extends SvelteElement {
    	constructor(options) {
    		super();

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$4,
    			create_fragment$4,
    			safe_not_equal,
    			{ source: 0 },
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["source"];
    	}

    	get source() {
    		return this.$$.ctx[0];
    	}

    	set source(source) {
    		this.$$set({ source });
    		flush();
    	}
    }

    customElements.define("assistant-nms-markdown", Markdown);

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\shared\tileLoading.svelte generated by Svelte v3.48.0 */

    const file$3 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\shared\\tileLoading.svelte";

    function create_fragment$3(ctx) {
    	let assistant_nms_common_tile;

    	const block = {
    		c: function create() {
    			assistant_nms_common_tile = element("assistant-nms-common-tile");
    			this.c = noop;
    			set_custom_element_data(assistant_nms_common_tile, "imageurl", "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiID8+DQo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMjMuMC4xLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAtLT4NCjxzdmcNCiAgdmVyc2lvbj0iMS4xIg0KICBpZD0iTGF5ZXJfMSINCiAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIg0KICB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayINCiAgdmlld0JveD0iMCAwIDIwMCA0MDAiDQogIHg9IjBweCINCiAgeT0iMHB4Ig0KICB4bWw6c3BhY2U9InByZXNlcnZlIg0KPg0KCTxzdHlsZQ0KICAgIHR5cGU9InRleHQvY3NzIg0KICA+IHBvbHlnb25bY2xhc3NePSJkaWFtb25kLSJdIHtmaWxsOiMwMDAwMDA7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjE7fSBwb2x5Z29uW2NsYXNzXj0iZGlhbW9uZC13aGl0ZS0iXSB7ZmlsbDojRkZGRkZGO3N0cm9rZTojRkZGRkZGO3N0cm9rZS13aWR0aDoxO30NCgkJLmNpcmNsZXtmaWxsOm5vbmU7c3Ryb2tlOiNmZmZmZmY7c3Ryb2tlLXdpZHRoOjY7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fQ0KCQkuaW5uZXItYXRsYXN7c3Ryb2tlLXdpZHRoOjY7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fQ0KCQkuY292ZXJ7ZmlsbDojMDAwMDAwO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDo2O3N0cm9rZS1taXRlcmxpbWl0OjEwO30NCgkJLm91dGxpbmUge3N0cm9rZTogd2hpdGU7IHN0cm9rZS13aWR0aDo0O30NCgkJDQoJCXN2ZyB7DQoJCXBvc2l0aW9uOiByZWxhdGl2ZTsNCgkJYW5pbWF0aW9uOiB1cEFuZERvd24gMXMgZWFzZS1pbi1vdXQgaW5maW5pdGU7DQoJCX0NCgkJc3ZnIC5yb3RhdGUgew0KCQl0cmFuc2Zvcm0tb3JpZ2luOiAxMDBweCAxMzBweDsNCgkJcG9zaXRpb246IHJlbGF0aXZlOw0KCQlhbmltYXRpb246IHJvdGF0ZUNXIDEuNXMgbGluZWFyIGluZmluaXRlOw0KCQl9DQoJCQ0KCQlAa2V5ZnJhbWVzIHVwQW5kRG93biB7DQoJCTAlIHsNCgkJdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApOw0KCQl9DQoJCTUwJSB7DQoJCXRyYW5zZm9ybTogdHJhbnNsYXRlWSgxMHB4KTsNCgkJfQ0KCQkxMDAlIHsNCgkJdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApOw0KCQl9DQoJCX0NCgkJDQoJCUBrZXlmcmFtZXMgcm90YXRlQ1cgew0KCQkxMDAlIHsNCgkJdHJhbnNmb3JtOiByb3RhdGUoMzYwZGVnKTsNCgkJfQ0KCQl9DQoJPC9zdHlsZT4NCgk8ZGVmcz4NCgkJPGxpbmVhckdyYWRpZW50IGlkPSJhdGxhcyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPg0KCQkJPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6cmdiKDI1NSwwLDApO3N0b3Atb3BhY2l0eToxIiAvPg0KCQkJPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjpyZ2IoMTU1LDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQoJCTwvbGluZWFyR3JhZGllbnQ+DQoJPC9kZWZzPg0KCTxnPg0KCQk8cG9seWdvbg0KICAgICAgY2xhc3M9ImRpYW1vbmQtcmlnaHQiDQogICAgICBwb2ludHM9IjEwMCwyMCAxOTAsMTMwIDEwMCwzMDAiDQogICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiDQogICAgLz4NCgkJPGNpcmNsZQ0KICAgICAgY2xhc3M9ImlubmVyLWF0bGFzIHJvdGF0ZSINCiAgICAgIGN4PSIxMDAiDQogICAgICBjeT0iMTMwIg0KICAgICAgcj0iNDUiDQogICAgICBmaWxsPSJ1cmwoI2F0bGFzKSINCiAgICAvPg0KCQk8cG9seWdvbg0KICAgICAgY2xhc3M9ImRpYW1vbmQtd2hpdGUtdG9wLWxlZnQiDQogICAgICBwb2ludHM9IjEwMCwzMiAxODAsMTMwIDEwMCwxMTAiDQogICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiDQogICAgLz4NCgkJPGxpbmUNCiAgICAgIGNsYXNzPSJjb3ZlciINCiAgICAgIHgxPSIxODUiDQogICAgICB5MT0iMTMyIg0KICAgICAgeDI9IjEwMCINCiAgICAgIHkyPSIxMTAiDQogICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiDQogICAgLz4NCgkJPHBvbHlnb24NCiAgICAgIGNsYXNzPSJkaWFtb25kLWxlZnQiDQogICAgICBwb2ludHM9IjEwMCwyMCAxMCwxMzAgMTAwLDMwMCINCiAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCINCiAgICAvPg0KCQk8bGluZQ0KICAgICAgY2xhc3M9Im91dGxpbmUiDQogICAgICB4MT0iMTAwIg0KICAgICAgeTE9IjIwIg0KICAgICAgeDI9IjE5MCINCiAgICAgIHkyPSIxMzAiDQogICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiDQogICAgLz4NCgkJPGxpbmUNCiAgICAgIGNsYXNzPSJvdXRsaW5lIg0KICAgICAgeDE9IjE5MCINCiAgICAgIHkxPSIxMzAiDQogICAgICB4Mj0iMTAwIg0KICAgICAgeTI9IjMwMCINCiAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCINCiAgICAvPg0KCQk8bGluZQ0KICAgICAgY2xhc3M9Im91dGxpbmUiDQogICAgICB4MT0iMTAwIg0KICAgICAgeTE9IjMwMCINCiAgICAgIHgyPSIxMCINCiAgICAgIHkyPSIxMzAiDQogICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiDQogICAgLz4NCgkJPGxpbmUNCiAgICAgIGNsYXNzPSJvdXRsaW5lIg0KICAgICAgeDE9IjEwIg0KICAgICAgeTE9IjEzMCINCiAgICAgIHgyPSIxMDAiDQogICAgICB5Mj0iMjAiDQogICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiDQogICAgLz4NCgk8L2c+DQo8L3N2Zz4NCg==");
    			set_custom_element_data(assistant_nms_common_tile, "name", "Loading");
    			add_location(assistant_nms_common_tile, file$3, 4, 0, 86);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, assistant_nms_common_tile, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(assistant_nms_common_tile);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-tile-loading', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-tile-loading> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class TileLoading extends SvelteElement {
    	constructor(options) {
    		super();

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("assistant-nms-tile-loading", TileLoading);

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\shared\tooltip.svelte generated by Svelte v3.48.0 */

    const file$2 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\shared\\tooltip.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let slot;
    	let t0;
    	let span;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			slot = element("slot");
    			t0 = space();
    			span = element("span");
    			t1 = text(/*tooltiptext*/ ctx[0]);
    			this.c = noop;
    			add_location(slot, file$2, 6, 2, 136);
    			attr_dev(span, "class", "tooltiptext");
    			add_location(span, file$2, 7, 2, 148);
    			attr_dev(div, "class", "tooltip");
    			add_location(div, file$2, 5, 0, 111);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, slot);
    			append_dev(div, t0);
    			append_dev(div, span);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*tooltiptext*/ 1) set_data_dev(t1, /*tooltiptext*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-tooltip', slots, []);
    	let { tooltiptext = "" } = $$props;
    	const writable_props = ['tooltiptext'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-tooltip> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('tooltiptext' in $$props) $$invalidate(0, tooltiptext = $$props.tooltiptext);
    	};

    	$$self.$capture_state = () => ({ tooltiptext });

    	$$self.$inject_state = $$props => {
    		if ('tooltiptext' in $$props) $$invalidate(0, tooltiptext = $$props.tooltiptext);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tooltiptext];
    }

    class Tooltip extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.tooltip{position:relative;display:inline-block}.tooltip .tooltiptext{left:50%;top:100%;min-width:200px;margin-left:-50%;visibility:hidden;background-color:var(--assistantnms-tooltip-background-colour, #383838);color:var(--assistantnms-tooltip-text-colour, #ffffff);text-align:center;border-radius:6px;padding:0.25em 0.5em;position:absolute;z-index:1}.tooltip:hover .tooltiptext{visibility:visible}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{ tooltiptext: 0 },
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["tooltiptext"];
    	}

    	get tooltiptext() {
    		return this.$$.ctx[0];
    	}

    	set tooltiptext(tooltiptext) {
    		this.$$set({ tooltiptext });
    		flush();
    	}
    }

    customElements.define("assistant-nms-tooltip", Tooltip);

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\shared\version.svelte generated by Svelte v3.48.0 */
    const file$1 = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\shared\\version.svelte";

    function create_fragment$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = `${/*versionName*/ ctx[0]}`;
    			this.c = noop;
    			add_location(span, file$1, 6, 0, 167);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('assistant-nms-version-tile', slots, []);
    	let versionName = currentVersion;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<assistant-nms-version-tile> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ currentVersion, versionName });

    	$$self.$inject_state = $$props => {
    		if ('versionName' in $$props) $$invalidate(0, versionName = $$props.versionName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [versionName];
    }

    class Version extends SvelteElement {
    	constructor(options) {
    		super();

    		this.shadowRoot.innerHTML = `<style>*{font-family:var(
      --assistantnms-font-family,
      "Roboto",
      Helvetica,
      Arial,
      sans-serif
    );font-weight:var(--assistantnms-font-weight, "bold")}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("assistant-nms-version-tile", Version);

    /* D:\Development\Projects\AssistantNMS\AssistantNMS.Github\AssistantNMS.WebComponent\src\App.svelte generated by Svelte v3.48.0 */

    const file = "D:\\Development\\Projects\\AssistantNMS\\AssistantNMS.Github\\AssistantNMS.WebComponent\\src\\App.svelte";

    function create_fragment(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = `Hello ${/*name*/ ctx[0]}!`;
    			this.c = noop;
    			add_location(h1, file, 5, 0, 87);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('my-counter', slots, []);
    	let name = "world";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<my-counter> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ name });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteElement {
    	constructor(options) {
    		super();

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}
    		}
    	}
    }

    customElements.define("my-counter", App);

    console.log(`AssistantApps.WebComponents v${currentVersion}`);

})();
//# sourceMappingURL=bundle.js.map
