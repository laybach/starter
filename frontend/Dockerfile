FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
# this has to be a build ARG (not just a runtime environment variable) to
# reach the browser bundle at all.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# This host runs the build with very little free RAM alongside other
# services — left uncapped, next build's default heap sizing has been
# observed getting silently OOM-killed by the OS mid-compile (no error,
# no failed build step, just a build that stops short and never writes
# .next/BUILD_ID). Capping V8's heap makes it garbage-collect under
# pressure instead of ballooning until the kernel kills it.
ENV NODE_OPTIONS=--max-old-space-size=640

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
