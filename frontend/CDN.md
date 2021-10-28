# subspace-relayer-frontend-cdn

Deployment with **Cloudflare Workers**.

- Login to your cloudflare account.
- Follow [this](https://developers.cloudflare.com/workers/get-started/guide) instructions to install wrangler (Workers CLI).

Once you have wrangler installed and tou are logged in, you can deploy your worker using your account.

## Init worker in frontend directory (react app)

Go to **frontend** directory and run:

```
wrangler init --site
```

This will create **wrangler.toml** and **workers-site** folder. For more information and examples visit [this](https://developers.cloudflare.com/workers/platform/sites) docs.

## Configure and publish

In **frontend** directory run:

- run : `npm install` to install packages before build.
- run : `npm run build` to generate build folder to be used by `wrangler publish`

_For production purposes check the following steps_, to deploy your worker in **production mode** and linked to a **subdomain**.

- **Create a cloudflare subdomain** as a **CNAME** record, and set the value to **domain.com**.

- Edit **wrangler.toml** with the following as example:

```
name = "app-name"
type = "webpack"
route = "app-name.domain.com/*"
zone_id = "your_cloudflare_zone_id"
usage_model = ""
compatibility_flags = []
workers_dev = false
site = {bucket = "./build", entry-point = "workers-site"}
compatibility_date = "2021-10-20"
account_id = "account_id_to_publish_worker"
```

- Run `wrangler publish` to build your worker using **wrangler.toml** configurations.

### Notes:

- `route = "app-name.domain.com/*"`: This is the subdomain that will be used to access your worker.
- `workers_dev = false`: This will create a non development worker. And use the `route` to access the app.

