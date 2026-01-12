import { defineConfig } from 'vite';

export default defineConfig({
    // GitHub Pagesで公開する場合、リポジトリ名に合わせてbaseを設定します
    // 例: https://<username>.github.io/<repository>/ なら base: '/<repository>/'
    base: './',
    build: {
        outDir: 'dist',
    }
});
