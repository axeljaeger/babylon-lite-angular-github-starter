# Babylon Lite Angular Github Starter

Starter project that integrates Babylon Lite into an Angular application.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?repo=axeljaeger/babylon-lite-angular-github-starter)

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.5.

The example scene was ported from `@babylonjs/core` to [`@babylonjs/lite`](https://www.npmjs.com/package/@babylonjs/lite) and now uses Lite's functional lifecycle (`createEngine`, `createSceneContext`, `registerScene`, `startEngine`) together with tree-shakable mesh and material factories.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.
