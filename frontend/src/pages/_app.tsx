import Head from 'next/head'
import getConfig from 'next/config'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { appWithTranslation, useTranslation } from 'next-i18next'

// Apollo
import withApollo from 'next-with-apollo'
import { useApollo } from 'gql/apollo-client'
import { getDataFromTree } from '@apollo/react-ssr'
import { ApolloProvider } from '@apollo/react-hooks'
import ApolloClient, { InMemoryCache } from 'apollo-boost'

// MaterialUI
import { LinearProgress } from '@material-ui/core'
import { ThemeProvider } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline'

// Keycloak
import { SSRKeycloakProvider, SSRCookies } from '@react-keycloak/ssr'

const {
  publicRuntimeConfig: { GRAPHQL_URL, keycloakConfig },
} = getConfig()

import theme from 'common/theme'
import useGTM from 'common/util/useGTM'

import 'styles/global.scss'

function CustomApp({ Component, pageProps }: AppProps) {
  const apollo = useApollo(pageProps)
  const router = useRouter()
  const { i18n } = useTranslation()
  const { initialize, trackEvent } = useGTM()

  useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side')
    if (jssStyles && jssStyles.parentElement) {
      jssStyles.parentElement.removeChild(jssStyles)
    }

    // Init GTM
    initialize({
      events: { user_lang: i18n.language },
    })
  }, [])

  // Register route change complete event handlers
  useEffect(() => {
    const onRouteChange = (url: string) => {
      trackEvent({
        event: 'page_view',
        user_lang: i18n.language,
        page_title: document.title,
        page_pathname: url,
        page_location:
          document.location.protocol +
          '//' +
          document.location.hostname +
          document.location.pathname +
          document.location.search,
      })
    }

    router.events.on('routeChangeComplete', onRouteChange)
    return () => router.events.off('routeChangeComplete', onRouteChange)
  }, [i18n.language])

  return (
    <ApolloProvider client={apollo}>
      <Head>
        <title>Podkrepi.bg</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <SSRKeycloakProvider
          LoadingComponent={<LinearProgress />}
          onEvent={(e, err) => console.log(e, err)}
          keycloakConfig={keycloakConfig}
          persistor={SSRCookies(pageProps?.keyCookies ?? {})}>
          <Component {...pageProps} />
        </SSRKeycloakProvider>
      </ThemeProvider>
    </ApolloProvider>
  )
}

const TranslatedApp = appWithTranslation(CustomApp)
// export default TranslatedApp
export default withApollo(
  ({ initialState }) => {
    return new ApolloClient({
      uri: GRAPHQL_URL,
      cache: new InMemoryCache().restore(initialState || {}),
    })
  },
  { getDataFromTree },
)(TranslatedApp)
