import { renderShell } from '../renderShell';

describe('renderShell', function() {
    it('works with content', function() {
        const actual = renderShell({
            content: '<p>Hello world!</p>',
        });
        expect(actual).toMatchSnapshot();
    });
});
