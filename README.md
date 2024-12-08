# @horihiro/textlint-plugin-bicep

## Description

`@horihiro/textlint-plugin-bicep` is a textlint plugin for processing Bicep files. It parses Bicep files into an AST (Abstract Syntax Tree) that can be used by textlint rules.

## Installation

Install the plugin using npm:

```sh
npm install @horihiro/textlint-plugin-bicep
```

## Usage
To use this plugin, add it to your .textlintrc.json configuration file:

```json
{
  "plugins": {
    "@horihiro/textlint-plugin-bicep": true
  }
}
```

You can then run textlint on your Bicep files:

```sh
textlint path/to/your/file.bicep
```

## Development
### Build

To build the project, run:

```sh
npm run build
```

### Lint
To lint the project, run:

```sh
npm run lint
```

### Test
To run tests, use:

```sh
npm test
```

## License
MIT © horihiro
