import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useFeatureFlags } from '~/providers/FeatureFlagsProvider';
import ProfileLayout from '~/components/Profile/ProfileLayout';
import { ProfileHeader } from '~/components/Profile/ProfileHeader';
import { AppLayout } from '~/components/AppLayout/AppLayout';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { trpc } from '~/utils/trpc';
import { postgresSlugify } from '~/utils/string-helpers';
import { invalidateModeratedContent } from '~/utils/query-invalidation-utils';
import { showErrorNotification } from '~/utils/notifications';
import { openConfirmModal } from '@mantine/modals';
import {
  ActionIcon,
  AspectRatio,
  Box,
  Card,
  Center,
  Container,
  createStyles,
  Divider,
  Group,
  Loader,
  Menu,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { NotFound } from '~/components/AppLayout/NotFound';
import { Meta } from '~/components/Meta/Meta';
import { abbreviateNumber } from '~/utils/number-helpers';
import { getEdgeUrl } from '~/client-utils/cf-images-utils';
import { env } from '~/env/client.mjs';
import { TrackView } from '~/components/TrackView/TrackView';
import { CivitaiTabs } from '~/components/CivitaiWrapped/CivitaiTabs';
import { EdgeMedia } from '~/components/EdgeMedia/EdgeMedia';
import { Username } from '~/components/User/Username';
import { formatDate } from '~/utils/date-helpers';
import { TipBuzzButton } from '~/components/Buzz/TipBuzzButton';
import { FollowUserButton } from '~/components/FollowUserButton/FollowUserButton';
import {
  IconArrowBackUp,
  IconBan,
  IconCategory,
  IconDotsVertical,
  IconFileText,
  IconFlag,
  IconFolder,
  IconInfoCircle,
  IconLayoutList,
  IconMicrophone,
  IconMicrophoneOff,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react';
import { NextLink } from '@mantine/next';
import { HideUserButton } from '~/components/HideUserButton/HideUserButton';
import { LoginRedirect } from '~/components/LoginRedirect/LoginRedirect';
import { openContext } from '~/providers/CustomModalsProvider';
import { ReportEntity } from '~/server/schema/report.schema';
import { RankBadge } from '~/components/Leaderboard/RankBadge';
import { UserStatBadges } from '~/components/UserStatBadges/UserStatBadges';
import { sortDomainLinks } from '~/utils/domain-link';
import { DomainIcon } from '~/components/DomainIcon/DomainIcon';

function NestedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { username } = router.query as { username: string };
  const currentUser = useCurrentUser();
  const { classes, theme } = useStyles();
  const queryUtils = trpc.useContext();
  const features = useFeatureFlags();

  const { data: user, isLoading: userLoading } = trpc.user.getCreator.useQuery({ username });

  const { models: uploads } = user?._count ?? { models: 0 };
  const stats = user?.stats;
  const isMod = currentUser && currentUser.isModerator;
  const isSameUser =
    !!currentUser && postgresSlugify(currentUser.username) === postgresSlugify(username);

  const removeContentMutation = trpc.user.removeAllContent.useMutation({
    onSuccess() {
      invalidateModeratedContent(queryUtils);
    },
  });
  const toggleMuteMutation = trpc.user.toggleMute.useMutation({
    async onMutate() {
      await queryUtils.user.getCreator.cancel({ username });

      const prevUser = queryUtils.user.getCreator.getData({ username });
      queryUtils.user.getCreator.setData({ username }, () =>
        prevUser
          ? {
              ...prevUser,
              muted: !prevUser.muted,
            }
          : undefined
      );

      return { prevUser };
    },
    onError(_error, _vars, context) {
      queryUtils.user.getCreator.setData({ username }, context?.prevUser);
      showErrorNotification({
        error: new Error('Unable to mute user, please try again.'),
      });
    },
  });
  const handleToggleMute = () => {
    if (user) toggleMuteMutation.mutate({ id: user.id });
  };
  const toggleBanMutation = trpc.user.toggleBan.useMutation({
    async onMutate() {
      await queryUtils.user.getCreator.cancel({ username });

      const prevUser = queryUtils.user.getCreator.getData({ username });
      queryUtils.user.getCreator.setData({ username }, () =>
        prevUser
          ? {
              ...prevUser,
              bannedAt: prevUser.bannedAt ? null : new Date(),
            }
          : undefined
      );

      return { prevUser };
    },
    onError(_error, _vars, context) {
      queryUtils.user.getCreator.setData({ username }, context?.prevUser);
      showErrorNotification({
        error: new Error('Unable to ban user, please try again.'),
      });
    },
  });
  const handleToggleBan = () => {
    if (user) {
      if (user.bannedAt) toggleBanMutation.mutate({ id: user.id });
      else
        openConfirmModal({
          title: 'Ban User',
          children: `Are you sure you want to ban this user? Once a user is banned, they won't be able to access the app again.`,
          labels: { confirm: 'Yes, ban the user', cancel: 'Cancel' },
          confirmProps: { color: 'red' },
          onConfirm: () => toggleBanMutation.mutate({ id: user.id }),
        });
    }
  };
  const handleRemoveContent = () => {
    if (!user) return;
    openConfirmModal({
      title: 'Remove All Content',
      children: `Are you sure you want to remove all content (models, reviews, comments, posts, and images) by this user? This action cannot be undone.`,
      labels: { confirm: 'Yes, remove all content', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => removeContentMutation.mutate({ id: user.id }),
    });
  };

  // Redirect all users to the creator's models tab if they have uploaded models
  useEffect(() => {
    if (router.pathname !== '/user/[username]') return;
    if (uploads > 0) router.replace(`/user/${username}/models`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads, username, features]);

  if (userLoading && !user)
    return (
      <Container>
        <Center p="xl">
          <Loader size="lg" />
        </Center>
      </Container>
    );

  if (!userLoading && !user) return <NotFound />;

  const activeTab = router.pathname.split('/[username]').pop()?.split('?')[0] || '/images';

  return (
    <>
      {user && stats ? (
        <Meta
          title={`${user.username} Creator Profile | Civitai`}
          description={`Average Rating: ${stats.ratingAllTime.toFixed(1)} (${abbreviateNumber(
            stats.ratingCountAllTime
          )}), Models Uploaded: ${abbreviateNumber(uploads)}, Followers: ${abbreviateNumber(
            stats.followerCountAllTime
          )}, Total Likes Received: ${abbreviateNumber(
            stats.favoriteCountAllTime
          )}, Total Downloads Received: ${abbreviateNumber(stats.downloadCountAllTime)}. `}
          image={!user.image ? undefined : getEdgeUrl(user.image, { width: 1200 })}
          links={[{ href: `${env.NEXT_PUBLIC_BASE_URL}/user/${username}`, rel: 'canonical' }]}
        />
      ) : (
        <Meta
          title="Creator Profile | Civitai"
          description="Learn more about this awesome creator on Civitai."
        />
      )}
      {user && <TrackView entityId={user.id} entityType="User" type="ProfileView" />}
      <CivitaiTabs
        value={activeTab}
        onTabChange={(value) => router.push(`/user/${username}${value}`)}
      >
        {user && (
          <>
            <Box className={classes.banner} mb="md">
              <Container size="sm" p={0}>
                <Stack className={classes.wrapper} spacing="md" align="center">
                  {user.image && (
                    <div className={classes.outsideImage}>
                      <AspectRatio ratio={1} className={classes.image}>
                        <EdgeMedia
                          src={user.image}
                          name={user.username}
                          width={145}
                          alt={user.username ?? ''}
                        />
                      </AspectRatio>
                    </div>
                  )}
                  <Card radius="sm" className={classes.card} withBorder shadow="sm">
                    <Group noWrap>
                      {user.image && (
                        <div className={classes.insideImage}>
                          <AspectRatio ratio={1} className={classes.image}>
                            <EdgeMedia
                              src={user.image}
                              name={user.username}
                              width={145}
                              alt={user.username ?? ''}
                            />
                          </AspectRatio>
                        </div>
                      )}
                      <Stack spacing="xs" sx={{ flexGrow: 1 }}>
                        <Group position="apart" spacing={8} align="flex-start">
                          <Stack spacing={0}>
                            <Title
                              className={classes.username}
                              order={2}
                              size={24}
                              weight={600}
                              lh={1.5}
                            >
                              <Username {...user} size="md" inherit />
                            </Title>
                            <Text className={classes.joinedDate} size="md" color="dimmed">
                              {`Joined ${formatDate(user.createdAt)}`}
                            </Text>
                          </Stack>
                          <Group className={classes.userActions} spacing={8} noWrap>
                            <TipBuzzButton toUserId={user.id} size="md" compact />
                            <FollowUserButton userId={user.id} size="md" compact />
                            <Menu position="left" withinPortal>
                              <Menu.Target>
                                <ActionIcon
                                  loading={removeContentMutation.isLoading}
                                  size={30}
                                  radius="xl"
                                  color="gray"
                                  variant={theme.colorScheme === 'dark' ? 'filled' : 'light'}
                                  ml="auto"
                                >
                                  <IconDotsVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <>
                                  {isMod && (
                                    <>
                                      {env.NEXT_PUBLIC_USER_LOOKUP_URL && (
                                        <Menu.Item
                                          component="a"
                                          target="_blank"
                                          icon={<IconInfoCircle size={14} stroke={1.5} />}
                                          href={`${env.NEXT_PUBLIC_USER_LOOKUP_URL}${user.id}`}
                                        >
                                          Lookup User
                                        </Menu.Item>
                                      )}
                                      <Menu.Item
                                        color={user.bannedAt ? 'green' : 'red'}
                                        icon={
                                          !user.bannedAt ? (
                                            <IconBan size={14} stroke={1.5} />
                                          ) : (
                                            <IconArrowBackUp size={14} stroke={1.5} />
                                          )
                                        }
                                        onClick={handleToggleBan}
                                      >
                                        {user.bannedAt ? 'Restore user' : 'Ban user'}
                                      </Menu.Item>
                                      <Menu.Item
                                        color="red"
                                        icon={<IconTrash size={14} stroke={1.5} />}
                                        onClick={handleRemoveContent}
                                      >
                                        Remove all content
                                      </Menu.Item>
                                      <Menu.Item
                                        icon={
                                          user.muted ? (
                                            <IconMicrophone size={14} stroke={1.5} />
                                          ) : (
                                            <IconMicrophoneOff size={14} stroke={1.5} />
                                          )
                                        }
                                        onClick={handleToggleMute}
                                      >
                                        {user.muted ? 'Unmute user' : 'Mute user'}
                                      </Menu.Item>
                                    </>
                                  )}
                                  {isSameUser && (
                                    <Menu.Item
                                      component={NextLink}
                                      href={`/user/${user.username}/manage-categories`}
                                    >
                                      Manage model categories
                                    </Menu.Item>
                                  )}
                                  <HideUserButton as="menu-item" userId={user.id} />
                                  <LoginRedirect reason="report-user">
                                    <Menu.Item
                                      icon={<IconFlag size={14} stroke={1.5} />}
                                      onClick={() =>
                                        openContext('report', {
                                          entityType: ReportEntity.User,
                                          entityId: user.id,
                                        })
                                      }
                                    >
                                      Report
                                    </Menu.Item>
                                  </LoginRedirect>
                                </>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Group>
                        <Group spacing={8}>
                          <RankBadge rank={user.rank} size="lg" />
                          {stats && (
                            <UserStatBadges
                              rating={{
                                value: stats.ratingAllTime,
                                count: stats.ratingCountAllTime,
                              }}
                              uploads={uploads}
                              followers={stats.followerCountAllTime}
                              favorite={stats.favoriteCountAllTime}
                              downloads={stats.downloadCountAllTime}
                              username={user.username}
                            />
                          )}
                        </Group>
                        {!!user.links?.length && (
                          <Group spacing={4}>
                            {sortDomainLinks(user.links).map((link, index) => (
                              <ActionIcon
                                key={index}
                                component="a"
                                href={link.url}
                                target="_blank"
                                rel="nofollow noreferrer"
                                size={32}
                              >
                                <DomainIcon domain={link.domain} size={22} />
                              </ActionIcon>
                            ))}
                          </Group>
                        )}
                      </Stack>
                    </Group>
                  </Card>
                  <Tabs.List position="center">
                    <Tabs.Tab value="/models" icon={<IconCategory size="1rem" />}>
                      Models
                    </Tabs.Tab>
                    <Tabs.Tab value="/images" icon={<IconPhoto size="1rem" />}>
                      Images
                    </Tabs.Tab>
                    <Tabs.Tab value="/posts" icon={<IconLayoutList size="1rem" />}>
                      Posts
                    </Tabs.Tab>
                    {features.articles && (
                      <Tabs.Tab value="/articles" icon={<IconFileText size="1rem" />}>
                        Articles
                      </Tabs.Tab>
                    )}
                    {features.profileCollections && (
                      <Tabs.Tab value="/collections" icon={<IconFolder size="1rem" />}>
                        Collections
                      </Tabs.Tab>
                    )}
                  </Tabs.List>
                </Stack>
              </Container>
            </Box>
            {children}
          </>
        )}
      </CivitaiTabs>
    </>
  );
}

const useStyles = createStyles((theme) => ({
  banner: {
    position: 'relative',
    marginTop: `-${theme.spacing.md}px`,
    paddingTop: theme.spacing.xl * 2,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[1],

    [`@media (max-width: ${theme.breakpoints.xs}px)`]: {
      paddingTop: theme.spacing.md,
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.md,
    },
  },
  image: {
    width: '145px',
    borderRadius: theme.radius.xs,
    overflow: 'hidden',
  },
  wrapper: {
    [`@media (max-width: ${theme.breakpoints.xs}px)`]: {
      alignItems: 'center',
    },
  },
  outsideImage: {
    display: 'none',
    [`@media (max-width: ${theme.breakpoints.xs}px)`]: {
      borderRadius: theme.radius.md,
      display: 'block',
    },
  },
  insideImage: {
    borderRadius: theme.radius.md,
    [`@media (max-width: ${theme.breakpoints.xs}px)`]: {
      display: 'none',
    },
  },
  card: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
    width: '100%',

    [theme.fn.smallerThan('sm')]: {
      padding: 8,
    },
  },
  userActions: {
    [theme.fn.smallerThan('sm')]: {
      flexGrow: 1,
    },
  },
  username: {
    [theme.fn.smallerThan('sm')]: {
      fontSize: theme.fontSizes.md,
    },
  },
  joinedDate: {
    [theme.fn.smallerThan('sm')]: {
      fontSize: theme.fontSizes.xs,
    },
  },
}));

function LayoutSelector({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { username } = router.query as { username: string };
  const features = useFeatureFlags();

  if (features.profileOverhaul) {
    return (
      <ProfileLayout username={username}>
        <ProfileHeader username={username} />
        {children}
      </ProfileLayout>
    );
  }

  return <NestedLayout>{children}</NestedLayout>;
}

export const UserProfileLayout = (page: React.ReactElement) => (
  <AppLayout>
    <LayoutSelector>{page}</LayoutSelector>
  </AppLayout>
);
