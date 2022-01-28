# PolkADAPT Project Workspace

**Note: If you wish to use PolkADAPT in your application, please follow the installation instructions in the README file of `@polkadapt/core` (or `projects/core/README.md`).**

PolkADAPT is an Augmented Data Application Protocol Technology that aims to be a framework to serve as a data abstraction layer and piping mechanism for applications by providing one single function call namespace and smart data augmentation.

> For example, you can get realtime data from a Kusama RPC node, augmented with indexed data from [Polkascan.io](https://polkascan.io/) and KSM-USD price information from a third party's API using the commands provided by the PolkADAPT system.

## About this repository ##

You're looking at the project workspace and source repository for the `@polkadapt` NPM packages. This workspace was generated with [Angular](https://angular.io/guide/creating-libraries) to leverage the testing and building tools that come with it.

**Note:** Angular is **not** a dependency of the resulting project libraries. You don't need Angular to use PolkADAPT in your application. The `@polkadapt` packages are not tied to any application development framework, so you can use this in React, Vue, Angular, etc.

## How to use (for application developers) ##

To use PolkADAPT in your application, follow the installation instructions in the README file of `@polkadapt/core` (or `projects/core/README.md`).

## How to build (for maintainers of this project) ##

If you wish to develop and build the packages yourself, install the workspace development dependencies (`npm install`) and build the libraries with the command `npm run build`. The resulting package files are stored in the `dist` directory.

If you would like to learn about the build environment, please check out the [Angular libary documentation](https://angular.io/guide/creating-libraries).

## Maintenance ##

We aim to keep the build environment updated with the latest versions. Version ranges can be found in the root `package.json` file.

The `npm install` command will automatically update the build environment's dependencies.

For all of our individually published packages there's no need to regularly change dependency versions in code, unless building fails with a newer dependency version. That's why it's recommended to test the build process for every new version of a dependency. If the build fails, it's time to fix, build and publish a new version of our package.

The `npm run build` command will automatically update individual package dependencies before building.

For `substrate-rpc`, we chose to allow a specific version range of `@polkadot/api` as a peer dependency, which means that application developers must install a version (preferably the latest) within this range as a dependency of their applications.

### Update build environment ###

Angular has some tooling to help upgrade the build environment to a newer stack.

```shell
# It's recommended to have @angular/cli installed globally:
npm -g install @angular/cli

# To update an existing installation:
npm -g update @angular/cli

# To upgrade the build environment, run this command
# in the same directory as this README:
ng update @angular/cli @angular/core --allow-dirty

# Sometimes we want to compare project structure and 
# dependencies with a new blank Angular project.
# Outside of this repository, you can run:
ng new --strict --create-application=false testdir

# You now have a directory 'testdir' to compare with.
# Generate a library in it, so all remaining
# dependencies are installed as well:
cd testdir
ng generate library my-lib

# You can now compare these files with our project, e.g. package.json, angular.json.
```
