// @ts-nocheck
import {
  setUseProxies,
  createDraft,
  // finishDraft,
  produce,
  isDraft,
  enablePatches,
} from '../src/immer';

enablePatches();

const isProd = process.env.NODE_ENV === 'production';

runTests('proxy', true);
// !!! This is different from immer
function runTests(name) {
  describe('manual - ' + name, () => {
    it('should check arguments', () => {
      expect(() => createDraft(3)).toThrowErrorMatchingSnapshot();
      const buf = Buffer.from([]);
      expect(() => createDraft(buf)).toThrowErrorMatchingSnapshot();
      // expect(() => finishDraft({})).toThrowErrorMatchingSnapshot();
    });

    it('should support manual drafts', () => {
      const state = [{}, {}, {}];

      const [draft, finishDraft] = createDraft(state);
      draft.forEach((item, index) => {
        item.index = index;
      });

      const result = finishDraft(draft);

      expect(result).not.toBe(state);
      expect(result).toEqual([{ index: 0 }, { index: 1 }, { index: 2 }]);
      expect(state).toEqual([{}, {}, {}]);
    });

    if (!isProd)
      it('cannot modify after finish', () => {
        const state = { a: 1 };

        const [draft, finishDraft] = createDraft(state);
        draft.a = 2;
        expect(finishDraft(draft)).toEqual({ a: 2 });
        expect(() => {
          draft.a = 3;
        }).toThrowErrorMatchingSnapshot();
      });

    it('cannot finishDraft twice', () => {
      const state = { a: 1 };

      const [draft, finishDraft]= createDraft(state);
      draft.a = 2;
      expect(finishDraft(draft)).toEqual({ a: 2 });
      expect(() => {
        finishDraft(draft);
      }).toThrowErrorMatchingSnapshot();
    });

    it('should support patches drafts', () => {
      const state = { a: 1 };

      const [draft, finishDraft] = createDraft(state);
      draft.a = 2;
      draft.b = 3;

      const listener = jest.fn();
      const result = finishDraft(draft, listener);

      expect(result).not.toBe(state);
      expect(result).toEqual({ a: 2, b: 3 });
      expect(listener.mock.calls).toMatchSnapshot();
    });

    it('should handle multiple create draft calls', () => {
      const state = { a: 1 };

      const [draft, finishDraft] = createDraft(state);
      draft.a = 2;

      const [draft2, finishDraft2] = createDraft(state);
      draft2.b = 3;

      const result = finishDraft(draft);

      expect(result).not.toBe(state);
      expect(result).toEqual({ a: 2 });

      draft2.a = 4;
      const result2 = finishDraft2(draft2);
      expect(result2).not.toBe(result);
      expect(result2).toEqual({ a: 4, b: 3 });
    });

    it('combines with produce - 1', () => {
      const state = { a: 1 };

      const [draft, finishDraft] = createDraft(state);
      draft.a = 2;
      const res1 = produce(draft, (d) => {
        d.b = 3;
      });
      draft.b = 4;
      const res2 = finishDraft(draft);
      expect(res1).toEqual({ a: 2, b: 3 });
      expect(res2).toEqual({ a: 2, b: 4 });
    });

    it('combines with produce - 2', () => {
      const state = { a: 1 };

      const res1 = produce(state, (draft) => {
        draft.b = 3;
        const [draft2, finishDraft2] = createDraft(draft);
        draft.c = 4;
        draft2.d = 5;
        const res2 = finishDraft2(draft2);
        expect(res2).toEqual({
          a: 1,
          b: 3,
          d: 5,
        });
        draft.d = 2;
      });
      expect(res1).toEqual({
        a: 1,
        b: 3,
        c: 4,
        d: 2,
      });
    });

    !global.USES_BUILD &&
      it('should not finish drafts from produce', () => {
        produce({ x: 1 }, (draft) => {
          expect(() => finishDraft(draft)).toThrowErrorMatchingSnapshot();
        });
      });

    it('should not finish twice', () => {
      const [draft, finishDraft] = createDraft({ a: 1 });
      draft.a++;
      finishDraft(draft);
      expect(() => finishDraft(draft)).toThrowErrorMatchingSnapshot();
    });
  });
}
