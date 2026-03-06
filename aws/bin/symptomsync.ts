#!/usr/bin/env node
const cdk = require("aws-cdk-lib");
const { upchaarinfoStack } = require("../lib/upchaarinfo-stack");

const app = new cdk.App();
new upchaarinfoStack(app, "upchaarinfoStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});