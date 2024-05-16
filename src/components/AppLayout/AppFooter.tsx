import {
  Anchor,
  Button,
  ButtonProps,
  Code,
  createStyles,
  Footer,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { NextLink } from '@mantine/next';
import { useState } from 'react';
import { useContainerSmallerThan } from '~/components/ContainerProvider/useContainerSmallerThan';
import { RoutedDialogLink } from '~/components/Dialog/RoutedDialogProvider';
import { SocialLinks } from '~/components/SocialLinks/SocialLinks';
import { env } from '~/env/client.mjs';
import { useFeatureFlags } from '~/providers/FeatureFlagsProvider';

const buttonProps: ButtonProps = {
  size: 'xs',
  variant: 'subtle',
  color: 'gray',
  px: 'xs',
};

const hash = env.NEXT_PUBLIC_GIT_HASH;

export function AppFooter({ fixed = true }: { fixed?: boolean }) {
  const { classes, cx } = useStyles({ fixed });
  const [showHash, setShowHash] = useState(false);
  const mobile = useContainerSmallerThan('sm');
  const features = useFeatureFlags();

  return (
    <Footer className={cx(classes.root)} height="auto" p="sm" py={4}>
      <Group spacing={mobile ? 'sm' : 'lg'} sx={{ flexWrap: 'nowrap' }}>
        <Text
          weight={700}
          sx={{ whiteSpace: 'nowrap', userSelect: 'none' }}
          onDoubleClick={() => {
            if (hash) setShowHash((x) => !x);
          }}
        >
          &copy; Civitai {new Date().getFullYear()}
        </Text>
        {showHash && hash && (
          <Stack spacing={2}>
            <Text weight={500} size="xs" sx={{ lineHeight: 1.1 }}>
              Site Version
            </Text>
            <Anchor
              target="_blank"
              href={`/github/commit/${hash}`}
              w="100%"
              sx={{ '&:hover': { textDecoration: 'none' } }}
            >
              <Code sx={{ textAlign: 'center', lineHeight: 1.1, display: 'block' }}>
                {hash.substring(0, 7)}
              </Code>
            </Anchor>
          </Stack>
        )}
     </Group>
    </Footer>
  );
}

const useStyles = createStyles((theme, args: { fixed: boolean }) => ({
  root: {
    position: args.fixed ? 'fixed' : undefined,
    bottom: 0,
    right: 0,
    left: 0,
    borderTop: `1px solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
    // boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.05), 0 -1px 2px rgba(0, 0, 0, 0.1)',
    transitionProperty: 'transform',
    transitionDuration: '0.3s',
    transitionTimingFunction: 'linear',
    overflowX: 'auto',
    // transform: 'translateY(0)',
  },
  down: {
    transform: 'translateY(200%)',
    // bottom: '-60',
  },
}));
