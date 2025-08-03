cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

rm -rf dist/cjs/readPackageFileEsm.*

cat >dist/esm/package.json <<!EOF
{
    "type": "module"
}
!EOF

mv dist/esm/readPackageFileEsm.js dist/esm/readPackageFile.js
mv dist/esm/readPackageFileEsm.d.ts dist/esm/readPackageFile.d.ts
mv dist/esm/readPackageFileEsm.js.map dist/esm/readPackageFile.js.map
mv dist/esm/readPackageFileEsm.d.ts.map dist/esm/readPackageFile.d.ts.map
