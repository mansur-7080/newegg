import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Card,
  CardContent,
  CardMedia,
  Divider,
  TextField,
  Alert,
  Tooltip,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Build,
  CheckCircleOutline,
  ErrorOutline,
  Delete,
  SaveAlt,
  ShoppingCart,
  Share,
  Bolt,
  InfoOutlined,
  Sync,
  PrintOutlined,
  Compare,
  Star,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { useRouter } from 'next/router';
import ProductCard from '../../components/product/ProductCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PriceDisplay from '../../components/common/PriceDisplay';
import { styled } from '@mui/system';
import {
  fetchCompatibleComponents,
  validateBuild,
  saveBuild,
  fetchUserBuilds,
} from '../../services/api';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

// Define interfaces for TypeScript
interface BuildComponent {
  id: string;
  name?: string;
  model?: string;
  price: number;
  images?: string[];
  specifications?: Record<string, any>;
}

interface BuildValidation {
  compatible: boolean;
  issues: Array<{ message: string }>;
  warnings: Array<{ message: string }>;
  componentStatus: Record<
    string,
    {
      compatible: boolean;
      issue?: string;
    }
  >;
}

interface SavedBuild {
  id: string;
  name: string;
  components: Record<string, BuildComponent>;
  createdAt: string;
}

interface ComponentType {
  id: string;
  name: string;
  icon: string;
}

// Component types
const componentTypes: ComponentType[] = [
  { id: 'cpu', name: 'CPU / Protsessor', icon: '🧠' },
  { id: 'motherboard', name: 'Motherboard / Ona plata', icon: '🔌' },
  { id: 'memory', name: 'RAM / Operativ xotira', icon: '🧩' },
  { id: 'gpu', name: 'Video card / Videokarta', icon: '📺' },
  { id: 'storage', name: 'Storage / Saqlash qurilmasi', icon: '💾' },
  { id: 'case', name: 'Case / Korpus', icon: '📦' },
  { id: 'power', name: 'Power Supply / Quvvat manbai', icon: '⚡' },
  { id: 'cooling', name: 'CPU Cooler / Protsessor sovutgich', icon: '❄️' },
];

// Styled components
const ComponentCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  marginBottom: theme.spacing(2),
  position: 'relative',
  borderLeft: `4px solid ${theme.palette.primary.main}`,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
}));

const EmptyComponentCard = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.action.hover,
  border: `1px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const PCBuilderPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addBulkToCart } = useCart();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [buildComponents, setBuildComponents] = useState<Record<string, BuildComponent>>({});
  const [showComponentDialog, setShowComponentDialog] = useState<boolean>(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [buildName, setBuildName] = useState<string>('');
  const [savedBuildsDialogOpen, setSavedBuildsDialogOpen] = useState<boolean>(false);
  const [buildState, setBuildState] = useState<{ id?: string }>({});

  // Fetch user's saved builds
  const { data: savedBuilds, isLoading: savedBuildsLoading } = useQuery({
    queryKey: ['savedBuilds'],
    queryFn: () => fetchUserBuilds(),
    enabled: !!user,
  });

  // Fetch compatible components
  const { data: compatibleComponents, isLoading: componentsLoading } = useQuery({
    queryKey: ['compatibleComponents', selectedType, buildComponents],
    queryFn: () => fetchCompatibleComponents(selectedType, buildComponents),
    enabled: !!selectedType,
  });

  // Validate build compatibility
  const { data: buildValidation, refetch: validateCurrentBuild } = useQuery({
    queryKey: ['validateBuild', buildComponents],
    queryFn: () => validateBuild(buildComponents),
    enabled: Object.keys(buildComponents).length > 1,
    refetchOnWindowFocus: false,
  });

  // Save build mutation
  const saveBuildMutation = useMutation({
    mutationFn: (data: { name: string; components: Record<string, BuildComponent> }) =>
      saveBuild(data.name, data.components),
    onSuccess: (data: any) => {
      toast.success('Konfiguratsiya saqlandi!');
      setSaveDialogOpen(false);
      // Update build state with the returned ID
      setBuildState({ id: data.id });
      queryClient.invalidateQueries({ queryKey: ['savedBuilds'] });
    },
    onError: () => {
      toast.error('Konfiguratsiyani saqlashda xatolik yuz berdi');
    },
  });

  // Handle component selection
  const selectComponent = (componentType: string, component: BuildComponent) => {
    setBuildComponents((prev) => ({
      ...prev,
      [componentType]: component,
    }));
    setSelectedType(null);
    setShowComponentDialog(false);

    // Validate build after component selection
    setTimeout(() => {
      validateCurrentBuild();
    }, 500);
  };

  // Remove a component from the build
  const removeComponent = (componentType: string) => {
    setBuildComponents((prev) => {
      const newComponents = { ...prev };
      delete newComponents[componentType];
      return newComponents;
    });

    // Validate build after component removal
    setTimeout(() => {
      validateCurrentBuild();
    }, 500);
  };

  // Open component selection dialog
  const openComponentSelection = (componentType: string) => {
    setSelectedType(componentType);
    setShowComponentDialog(true);
  };

  // Save current build
  const handleSaveBuild = () => {
    if (!user) {
      toast.warn('Konfiguratsiyani saqlash uchun tizimga kiring');
      return;
    }

    if (Object.keys(buildComponents).length === 0) {
      toast.warn('Kamida bitta komponent tanlang');
      return;
    }

    setSaveDialogOpen(true);
  };

  // Submit save build
  const submitSaveBuild = () => {
    if (!buildName.trim()) {
      toast.warn('Konfiguratsiya nomini kiriting');
      return;
    }

    saveBuildMutation.mutate({
      name: buildName,
      components: buildComponents,
    });
  };

  // Add all components to cart
  const addAllToCart = () => {
    if (Object.keys(buildComponents).length === 0) {
      toast.warn('Kamida bitta komponent tanlang');
      return;
    }

    const cartItems = Object.values(buildComponents).map((component) => ({
      id: component.id,
      name: component.name || component.model,
      price: component.price,
      image: component.images?.[0] || '',
      quantity: 1,
    }));

    addBulkToCart(cartItems);
    toast.success("Barcha komponentlar savatga qo'shildi");
  };

  // Load saved build
  const loadBuild = (build: SavedBuild) => {
    setBuildComponents(build.components);
    setBuildState({ id: build.id });
    setSavedBuildsDialogOpen(false);

    // Validate loaded build
    setTimeout(() => {
      validateCurrentBuild();
    }, 500);
  };

  // Calculate total price
  const calculateTotalPrice = (): number => {
    return Object.values(buildComponents).reduce((total, component) => {
      return total + (component.price || 0);
    }, 0);
  };

  // Calculate estimated wattage
  const calculateEstimatedWattage = (): number => {
    let totalWattage = 0;

    if (buildComponents.cpu) {
      totalWattage += buildComponents.cpu.specifications?.tdp || 65;
    }

    if (buildComponents.gpu) {
      totalWattage += buildComponents.gpu.specifications?.tdp || 75;
    }

    // Add base wattage for other components
    totalWattage += 100;

    // Add 20% safety margin
    return Math.ceil(totalWattage * 1.2);
  };

  // Share build configuration
  const shareBuild = () => {
    if (Object.keys(buildComponents).length === 0) {
      toast.warn('Ulashish uchun kamida bitta komponent tanlang');
      return;
    }

    // Create a shareable URL with components
    const componentIds = Object.entries(buildComponents)
      .map(([type, component]) => `${type}=${component.id}`)
      .join('&');

    const shareUrl = `${window.location.origin}/pc-builder?${componentIds}`;

    if (navigator.share) {
      navigator
        .share({
          title: 'Mening kompyuter konfiguratsiyam',
          text: "Mana men yig'gan kompyuter konfiguratsiyasi:",
          url: shareUrl,
        })
        .catch((error) => {
          // Share failed - handle gracefully
          console.error('Share error:', error);
        });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast.success('Konfiguratsiya havolasi nusxalandi');
    }
  };

  // Printerga chiqarish uchun funksiya
  const handlePrintBuild = () => {
    window.print();
  };

  // Build validation handler function
  const validateBuildHandler = () => {
    if (Object.keys(buildComponents).length > 1) {
      validateCurrentBuild();
      toast.info('Komponentlar mosligi tekshirilmoqda...');
    } else {
      toast.warning('Tekshirish uchun kamida 2 ta komponent tanlang');
    }
  };

  // Tanlangan konfiguratsiyani solishtirish ro'yxatiga qo'shish
  const handleAddToCompare = (buildId: string | null) => {
    // Add build to comparison page
    if (buildId) {
      router.push(`/compare/builds?ids=${buildId}`);
    } else {
      toast.warning('Konfiguratsiyani saqlang va keyin solishtiring');
    }
  };

  // Tanlangan PC qismlarini yulduzchalar bilan belgilash funksiyasi
  const handleFavoriteComponent = (componentId: string) => {
    // Add logic to mark component as favorite
    toast.success("Mahsulot sevimlilarga qo'shildi");
  };

  // New component selection UI
  const renderExtraActions = () => (
    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
      <Button
        startIcon={<PrintOutlined />}
        variant="outlined"
        onClick={handlePrintBuild}
        size="small"
      >
        Chop etish
      </Button>
      <Button
        startIcon={<Compare />}
        variant="outlined"
        onClick={() => handleAddToCompare(buildState.id || null)}
        size="small"
      >
        Solishtirish
      </Button>
      <Button
        startIcon={<Sync />}
        variant="outlined"
        onClick={() => validateBuildHandler()}
        size="small"
      >
        Yangilash
      </Button>
    </Box>
  );

  // Load build from URL params on initial load
  useEffect(() => {
    if (router.isReady && router.query) {
      const componentPromises: Promise<{ type: string; component: BuildComponent } | null>[] = [];

      componentTypes.forEach(({ id }) => {
        if (router.query[id]) {
          componentPromises.push(
            fetch(`/api/products/${router.query[id]}`)
              .then((res) => res.json())
              .then((data) => ({ type: id, component: data as BuildComponent }))
              .catch(() => null)
          );
        }
      });

      if (componentPromises.length > 0) {
        Promise.all(componentPromises).then((results) => {
          const loadedComponents: Record<string, BuildComponent> = {};
          results.forEach((result) => {
            if (result) {
              loadedComponents[result.type] = result.component;
            }
          });

          if (Object.keys(loadedComponents).length > 0) {
            setBuildComponents(loadedComponents);

            // Validate loaded build
            setTimeout(() => {
              validateCurrentBuild();
            }, 500);
          }
        });
      }
    }
  }, [router.isReady, router.query]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Build sx={{ mr: 2 }} /> PC Builder / Kompyuter yig'ish
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Kompyuter konfiguratsiyangizni yarating. Tanlangan qismlar bir-biriga mosligini
          tekshiring. Tayyor konfiguratsiyani saqlang yoki sotib oling.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Main component selection area */}
        <Grid item xs={12} md={8}>
          {/* Component selection cards */}
          {componentTypes.map(({ id, name, icon }) => (
            <React.Fragment key={id}>
              {buildComponents[id] ? (
                <ComponentCard>
                  <CardMedia
                    component="img"
                    sx={{ width: 100, height: 100, objectFit: 'contain', p: 1 }}
                    image={buildComponents[id].images?.[0] || '/images/placeholder.png'}
                    alt={buildComponents[id].name}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <CardContent sx={{ flex: '1 0 auto', pb: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            {icon} {name}
                          </Typography>
                          <Typography variant="subtitle1" component="div" fontWeight="bold">
                            {buildComponents[id].name || buildComponents[id].model}
                          </Typography>
                          {buildComponents[id].specifications && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{ maxWidth: 400 }}
                            >
                              {Object.entries(buildComponents[id].specifications)
                                .slice(0, 3)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(' | ')}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="h6" color="primary">
                          {new Intl.NumberFormat('uz-UZ').format(buildComponents[id].price)} UZS
                        </Typography>
                      </Box>
                    </CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', pl: 2, pb: 1 }}>
                      <Button size="small" onClick={() => openComponentSelection(id)}>
                        O'zgartirish
                      </Button>
                      <Button size="small" color="error" onClick={() => removeComponent(id)}>
                        Olib tashlash
                      </Button>
                    </Box>
                  </Box>
                  {buildValidation?.componentStatus?.[id] && (
                    <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
                      {buildValidation.componentStatus[id].compatible ? (
                        <Tooltip title="Mos keladi">
                          <CheckCircleOutline color="success" />
                        </Tooltip>
                      ) : (
                        <Tooltip
                          title={buildValidation.componentStatus[id].issue || 'Mos kelmaydi'}
                        >
                          <ErrorOutline color="error" />
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </ComponentCard>
              ) : (
                <EmptyComponentCard onClick={() => openComponentSelection(id)}>
                  <Typography variant="subtitle1">
                    {icon} {name} qo'shish
                  </Typography>
                </EmptyComponentCard>
              )}
            </React.Fragment>
          ))}

          {/* Action buttons */}
          <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ShoppingCart />}
              onClick={addAllToCart}
              disabled={Object.keys(buildComponents).length === 0}
            >
              Barcha komponentlarni savatga qo'shish
            </Button>

            <Button
              variant="outlined"
              color="primary"
              startIcon={<SaveAlt />}
              onClick={handleSaveBuild}
              disabled={Object.keys(buildComponents).length === 0}
            >
              Konfiguratsiyani saqlash
            </Button>

            <Button
              variant="outlined"
              startIcon={<Share />}
              onClick={shareBuild}
              disabled={Object.keys(buildComponents).length === 0}
            >
              Ulashish
            </Button>

            {user && (
              <Button variant="outlined" onClick={() => setSavedBuildsDialogOpen(true)}>
                Saqlangan konfiguratsiyalar
              </Button>
            )}
          </Box>
        </Grid>

        {/* Build summary */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Konfiguratsiya ma'lumotlari
            </Typography>

            {/* Component count */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Tanlangan komponentlar
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {Object.keys(buildComponents).length} / {componentTypes.length}
              </Typography>
            </Box>

            {/* Compatibility status */}
            {buildValidation && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Moslik holati
                </Typography>
                {buildValidation.compatible ? (
                  <Chip
                    icon={<CheckCircleOutline />}
                    label="Barcha komponentlar mos keladi"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                ) : (
                  <Chip
                    icon={<ErrorOutline />}
                    label="Moslik muammolari mavjud"
                    color="error"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}

                {buildValidation.issues && buildValidation.issues.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {buildValidation.issues.map((issue: { message: string }, idx: number) => (
                      <Alert key={idx} severity="error" sx={{ mt: 1 }}>
                        {issue.message}
                      </Alert>
                    ))}
                  </Box>
                )}

                {buildValidation.warnings && buildValidation.warnings.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {buildValidation.warnings.map((warning: { message: string }, idx: number) => (
                      <Alert key={idx} severity="warning" sx={{ mt: 1 }}>
                        {warning.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Estimated wattage */}
            {Object.keys(buildComponents).length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <Bolt sx={{ mr: 1 }} /> Taxminiy quvvat talabi
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {calculateEstimatedWattage()} Vatt
                </Typography>
              </Box>
            )}

            {/* Price summary */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Umumiy narx
              </Typography>
              <Typography variant="h5" color="primary" fontWeight="bold">
                {new Intl.NumberFormat('uz-UZ').format(calculateTotalPrice())} UZS
              </Typography>
            </Box>

            {/* Missing components alert */}
            {Object.keys(buildComponents).length < 2 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                To'liq moslikni tekshirish uchun kamida 2 ta komponent tanlang
              </Alert>
            )}

            {/* Compatibility tips */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoOutlined sx={{ mr: 1, fontSize: 18 }} /> Moslik bo'yicha maslahatlar
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                • Protsessor va ona plata soketlari mos kelishi kerak
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Xotira modullari ona plata bilan mos kelishi kerak
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Quvvat manbai barcha komponentlar uchun yetarli bo'lishi kerak
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Component selection dialog */}
      <Dialog
        open={showComponentDialog}
        onClose={() => setShowComponentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {componentTypes.find((c) => c.id === selectedType)?.name || ''} tanlang
        </DialogTitle>
        <DialogContent dividers>
          {componentsLoading ? (
            <LoadingSpinner />
          ) : compatibleComponents && compatibleComponents.length > 0 ? (
            <Grid container spacing={2}>
              {compatibleComponents.map((component: BuildComponent) => (
                <Grid item xs={12} sm={6} md={4} key={component.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 6 },
                    }}
                    onClick={() => selectedType && selectComponent(selectedType, component)}
                  >
                    <CardMedia
                      component="img"
                      height="140"
                      image={component.images?.[0] || '/images/placeholder.png'}
                      alt={component.name}
                      sx={{ objectFit: 'contain', p: 2 }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" component="div" noWrap>
                        {component.name || component.model}
                      </Typography>
                      {component.specifications && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {Object.entries(component.specifications)
                            .slice(0, 2)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' | ')}
                        </Typography>
                      )}
                      <Typography variant="h6" color="primary">
                        {new Intl.NumberFormat('uz-UZ').format(component.price)} UZS
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              Mos komponentlar topilmadi
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowComponentDialog(false)}>Yopish</Button>
        </DialogActions>
      </Dialog>

      {/* Save build dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Konfiguratsiyani saqlash</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Konfiguratsiya nomi"
            type="text"
            fullWidth
            variant="outlined"
            value={buildName}
            onChange={(e) => setBuildName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Bekor qilish</Button>
          <Button
            onClick={submitSaveBuild}
            disabled={saveBuildMutation.isPending}
            variant="contained"
          >
            {saveBuildMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Saved builds dialog */}
      <Dialog
        open={savedBuildsDialogOpen}
        onClose={() => setSavedBuildsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Saqlangan konfiguratsiyalar</DialogTitle>
        <DialogContent dividers>
          {savedBuildsLoading ? (
            <LoadingSpinner />
          ) : savedBuilds && savedBuilds.length > 0 ? (
            <List>
              {savedBuilds &&
                savedBuilds.map((build: SavedBuild) => (
                  <ListItem
                    key={build.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemText
                      primary={build.name}
                      secondary={`${Object.keys(build.components).length} ta komponent | ${new Date(build.createdAt).toLocaleDateString('uz-UZ')}`}
                    />
                    <ListItemSecondaryAction>
                      <Button variant="outlined" size="small" onClick={() => loadBuild(build)}>
                        Yuklash
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
            </List>
          ) : (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              Saqlangan konfiguratsiyalar yo'q
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSavedBuildsDialogOpen(false)}>Yopish</Button>
        </DialogActions>
      </Dialog>

      {/* Extra actions (Print, Compare, Refresh) */}
      {renderExtraActions()}
    </Container>
  );
};

export default PCBuilderPage;
