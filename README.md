==============
Mathoid-server
==============

Mathoid-server is a service that uses MathJax and PhantomJS to create SVGs and MathML on server side.
Mathoid-server is a based on svgtex - https://github.com/agrbin/svgtex.



Installation
------------
see http://formulasearchengine.com/mathoid


API Description
---------------

to be written


Testing
-------
Base service:

Start the service

```
$ phantomjs main.js &

loading bench page
server started on port 16000
you can hit server with http://localhost:16000/?2^n
.. or by sending latex source in POST (not url encoded)
```

run a test command

```
$ curl localhost:16000/?aa=a^2

aa=a^2.. 6B query, OK 2393B result, took 15ms.
{"tex":"aa=a^2","svg":"<svg xmlns:xlink=\"http://www.w3.org/1999/xlink\" style=\"width: 7.875ex; height: 2.125ex; vertical-align: -0.125ex; margin-top: 1px; margin-right: 0px; margin-bottom: 1px; margin-left: 0px; position: static; \" viewBox=\"0 -859.4768963737118 3397.6444800547624 898.0576086653176\" xmlns=\"http://www.w3.org/2000/svg\"><defs id=\"MathJax_SVG_glyphs\"><path id=\"MJMATHI-61\" stroke-width=\"10\" d=\"M33 157Q33 258 109 349T280 441Q331 441 370 392Q386 422 416 422Q429 422 439 414T449 394Q449 381 412 234T374 68Q374 43 381 35T402 26Q411 27 422 35Q443 55 463 131Q469 151 473 152Q475 153 483 153H487Q506 153 506 144Q506 138 501 117T481 63T449 13Q436 0 417 -8Q409 -10 393 -10Q359 -10 336 5T306 36L300 51Q299 52 296 50Q294 48 292 46Q233 -10 172 -10Q117 -10 75 30T33 157ZM351 328Q351 334 346 350T323 385T277 405Q242 405 210 374T160 293Q131 214 119 129Q119 126 119 118T118 106Q118 61 136 44T179 26Q217 26 254 59T298 110Q300 114 325 217T351 328Z\"></path><path id=\"MJMAIN-3D\" stroke-width=\"10\" d=\"M56 347Q56 360 70 367H707Q722 359 722 347Q722 336 708 328L390 327H72Q56 332 56 347ZM56 153Q56 168 72 173H708Q722 163 722 153Q722 140 707 133H70Q56 140 56 153Z\"></path><path id=\"MJMAIN-32\" stroke-width=\"10\" d=\"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z\"></path></defs><g stroke=\"black\" fill=\"black\" stroke-width=\"0\" transform=\"matrix(1 0 0 -1 0 0)\"><use href=\"#MJMATHI-61\" xlink:href=\"#MJMATHI-61\"></use><use href=\"#MJMATHI-61\" x=\"534\" y=\"0\" xlink:href=\"#MJMATHI-61\"></use><use href=\"#MJMAIN-3D\" x=\"1345\" y=\"0\" xlink:href=\"#MJMAIN-3D\"></use><g transform=\"translate(2406,0)\"><use href=\"#MJMATHI-61\" xlink:href=\"#MJMATHI-61\"></use><use transform=\"scale(0.7071067811865476)\" href=\"#MJMAIN-32\" x=\"755\" y=\"513\" xlink:href=\"#MJMAIN-32\"></use></g></g></svg>","mml":"<math xmlns=\"http://www.w3.org/1998/Math/MathML\">\n  <mi>a</mi>\n  <mi>a</mi>\n  <mo>=</mo>\n  <msup>\n    <mi>a</mi>\n    <mn>2</mn>\n  </msup>\n</math>"}
```


Stability
---------

experimental.

Read https://github.com/agrbin/svgtex/wiki for more details!

Forked from https://github.com/agrbin/svgtex
