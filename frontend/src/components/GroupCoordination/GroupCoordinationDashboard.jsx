import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';

import {
  Users,
  User,
  Car,
  Hotel,
  Utensils,
  Ticket,
  Plane,
  FileText,
  Download,
  Printer,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  AlertTriangle,
  Clock,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  Eye,
  Send,
  RefreshCw,
  Settings,
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  UserPlus,
  Building,
  QrCode,
  Barcode,
  Globe,
  Navigation,
  CreditCard,
  Shield,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  FilePdf,
  FileJson,
  ClipboardList,
  ClipboardCheck,
} from 'lucide-react';

import { format, formatDistanceToNow, addDays, isBefore, isAfter, differenceInDays } from 'date-fns';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

// ================== Types ==================

const GROUP_TYPES = {
  INDIVIDUAL: 'Individual',
  GROUP: 'Group',
  RESERVED: 'Reserved',
  CORPORATE: 'Corporate',
  EDUCATIONAL: 'Educational',
  FAMILY: 'Family',
};

const SERVICE_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  MODIFIED: 'Modified',
  COMPLETED: 'Completed',
};

const VOUCHER_STATUS = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  CONFIRMED: 'Confirmed',
  USED: 'Used',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const REMINDER_PRIORITY = {
  LOW: { label: 'Low', color: 'bg-blue-500', icon: Info },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-500', icon: AlertCircle },
  HIGH: { label: 'High', color: 'bg-orange-500', icon: AlertTriangle },
  CRITICAL: { label: 'Critical', color: 'bg-red-500', icon: AlertTriangle },
};

// ================== Main Component ==================

const GroupCoordinationDashboard = () => {
  // State Management
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: { start: new Date(), end: addDays(new Date(), 30) },
    groupType: 'all',
    status: 'all',
    search: '',
  });
  
  // Dialog States
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  
  // Form States
  const [groupForm, setGroupForm] = useState({
    group_name: '',
    group_type: 'GROUP',
    start_date: '',
    end_date: '',
    total_participants: 0,
    notes: '',
  });
  
  const [assignmentForm, setAssignmentForm] = useState({
    role: 'guide',
    name: '',
    phone: '',
    email: '',
    license: '',
    languages: [],
    specializations: [],
  });
  
  const [reportConfig, setReportConfig] = useState({
    report_type: 'complete',
    include_guide_info: true,
    include_hotel_info: true,
    include_restaurant_info: true,
    include_entrance_info: true,
    include_flight_info: true,
    include_participant_list: true,
    include_rooming_list: true,
    include_vouchers: true,
    output_format: 'pdf',
    language: 'en',
  });

  // ================== Data Fetching ==================

  useEffect(() => {
    fetchGroups();
    setupReminderCheck();
  }, [filters]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: format(filters.dateRange.start, 'yyyy-MM-dd'),
        end_date: format(filters.dateRange.end, 'yyyy-MM-dd'),
      });
      
      if (filters.groupType !== 'all') params.append('type', filters.groupType);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      
      const response = await fetch(`/api/group-coordination/groups?${params}`);
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupReminderCheck = () => {
    // Check for missing assignments every hour
    const intervalId = setInterval(() => {
      checkMissingAssignments();
    }, 3600000); // 1 hour
    
    // Initial check
    checkMissingAssignments();
    
    return () => clearInterval(intervalId);
  };

  const checkMissingAssignments = async () => {
    try {
      const response = await fetch('/api/group-coordination/reminders/check', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.missing_assignments && data.missing_assignments.length > 0) {
          toast({
            title: 'Missing Assignments',
            description: `${data.missing_assignments.length} groups have missing assignments`,
            variant: 'warning',
          });
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  };

  // ================== Group Management ==================

  const createGroup = async () => {
    try {
      const response = await fetch('/api/group-coordination/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm),
      });
      
      if (response.ok) {
        const newGroup = await response.json();
        setGroups([...groups, newGroup]);
        setShowGroupDialog(false);
        resetGroupForm();
        toast({
          title: 'Success',
          description: 'Group created successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive',
      });
    }
  };

  const assignPersonnel = async () => {
    if (!selectedGroup) return;
    
    try {
      const response = await fetch(
        `/api/group-coordination/groups/${selectedGroup.group_id}/assign/${assignmentForm.role}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignmentForm),
        }
      );
      
      if (response.ok) {
        const assignment = await response.json();
        // Update local state
        const updatedGroups = groups.map(g => {
          if (g.group_id === selectedGroup.group_id) {
            if (assignmentForm.role === 'guide') {
              g.guide_assignment = assignment;
            } else if (assignmentForm.role === 'driver') {
              g.driver_assignment = assignment;
            } else if (assignmentForm.role === 'coordinator') {
              g.coordinator_assignment = assignment;
            }
          }
          return g;
        });
        setGroups(updatedGroups);
        setShowAssignmentDialog(false);
        resetAssignmentForm();
        toast({
          title: 'Success',
          description: `${assignmentForm.role} assigned successfully`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to assign ${assignmentForm.role}`,
        variant: 'destructive',
      });
    }
  };

  // ================== Report Generation ==================

  const generateReport = async () => {
    try {
      const response = await fetch('/api/group-coordination/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reportConfig,
          group_ids: selectedGroup ? [selectedGroup.group_id] : null,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Download the report
        downloadFile(data.content, data.filename);
        setShowReportDialog(false);
        toast({
          title: 'Success',
          description: 'Report generated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    }
  };

  const generateVoucher = async (type, serviceData) => {
    if (!selectedGroup) return;
    
    try {
      const voucherData = {
        category: type,
        group_id: selectedGroup.group_id,
        ...serviceData,
      };
      
      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherData),
      });
      
      if (response.ok) {
        const voucher = await response.json();
        toast({
          title: 'Success',
          description: `Voucher ${voucher.voucher_number} created`,
        });
        return voucher;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create voucher',
        variant: 'destructive',
      });
    }
  };

  const printVouchers = async (voucherIds) => {
    try {
      const response = await fetch('/api/vouchers/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_ids: voucherIds,
          format: 'pdf',
          combine: true,
          include_qr: true,
          include_barcode: true,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Download the PDF
        const binaryData = atob(data.content);
        const arrayBuffer = new ArrayBuffer(binaryData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: 'Success',
          description: 'Vouchers printed successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to print vouchers',
        variant: 'destructive',
      });
    }
  };

  // ================== Utility Functions ==================

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetGroupForm = () => {
    setGroupForm({
      group_name: '',
      group_type: 'GROUP',
      start_date: '',
      end_date: '',
      total_participants: 0,
      notes: '',
    });
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({
      role: 'guide',
      name: '',
      phone: '',
      email: '',
      license: '',
      languages: [],
      specializations: [],
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      MODIFIED: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDaysUntilStart = (startDate) => {
    const days = differenceInDays(new Date(startDate), new Date());
    if (days < 0) return 'Started';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  const getReminderPriority = (group) => {
    const daysUntil = differenceInDays(new Date(group.start_date), new Date());
    
    if (!group.guide_assignment || !group.driver_assignment) {
      if (daysUntil <= 7) return REMINDER_PRIORITY.CRITICAL;
      if (daysUntil <= 14) return REMINDER_PRIORITY.HIGH;
      if (daysUntil <= 30) return REMINDER_PRIORITY.MEDIUM;
      return REMINDER_PRIORITY.LOW;
    }
    return null;
  };

  // ================== Components ==================

  const GroupCard = ({ group }) => {
    const priority = getReminderPriority(group);
    const daysUntil = getDaysUntilStart(group.start_date);
    
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setSelectedGroup(group)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg">{group.group_name}</h3>
              <p className="text-sm text-gray-500">{group.group_number}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{GROUP_TYPES[group.group_type]}</Badge>
              <Badge className={getStatusColor(group.overall_status)}>
                {SERVICE_STATUS[group.overall_status]}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span>{format(new Date(group.start_date), 'MMM dd, yyyy')}</span>
              <span className="text-gray-400">-</span>
              <span>{format(new Date(group.end_date), 'MMM dd, yyyy')}</span>
              <Badge variant="outline" className="ml-auto">{daysUntil}</Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{group.total_participants} participants</span>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <User className={`w-4 h-4 ${group.guide_assignment ? 'text-green-500' : 'text-red-500'}`} />
                <span className={group.guide_assignment ? 'text-green-600' : 'text-red-600'}>
                  {group.guide_assignment ? group.guide_assignment.guide_name : 'No Guide'}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <Car className={`w-4 h-4 ${group.driver_assignment ? 'text-green-500' : 'text-red-500'}`} />
                <span className={group.driver_assignment ? 'text-green-600' : 'text-red-600'}>
                  {group.driver_assignment ? group.driver_assignment.guide_name : 'No Driver'}
                </span>
              </div>
            </div>
            
            {priority && (
              <Alert className={`p-2 ${priority.color}`}>
                <priority.icon className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Missing assignments - {priority.label} priority
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2 pt-2">
              <div className="flex items-center gap-1">
                <Hotel className="w-4 h-4 text-gray-400" />
                <span className="text-xs">{group.hotel_reservations?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Utensils className="w-4 h-4 text-gray-400" />
                <span className="text-xs">{group.restaurant_reservations?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Ticket className="w-4 h-4 text-gray-400" />
                <span className="text-xs">{group.entrance_tickets?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Plane className="w-4 h-4 text-gray-400" />
                <span className="text-xs">{group.flights?.length || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const GroupDetails = ({ group }) => {
    if (!group) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Select a group to view details</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{group.group_name}</h2>
              <p className="text-gray-500">{group.group_number}</p>
              <div className="flex gap-2 mt-2">
                <Badge>{GROUP_TYPES[group.group_type]}</Badge>
                <Badge className={getStatusColor(group.overall_status)}>
                  {SERVICE_STATUS[group.overall_status]}
                </Badge>
                <Badge variant="outline">{getDaysUntilStart(group.start_date)}</Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReportDialog(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowVoucherDialog(true)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Vouchers
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-semibold">{format(new Date(group.start_date), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-semibold">{format(new Date(group.end_date), 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-semibold">
                {differenceInDays(new Date(group.end_date), new Date(group.start_date)) + 1} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Participants</p>
              <p className="font-semibold">{group.total_participants} people</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="hotels">Hotels</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="flights">Flights</TabsTrigger>
            <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assignments" className="mt-4">
            <AssignmentsTab group={group} />
          </TabsContent>
          
          <TabsContent value="hotels" className="mt-4">
            <HotelsTab group={group} />
          </TabsContent>
          
          <TabsContent value="restaurants" className="mt-4">
            <RestaurantsTab group={group} />
          </TabsContent>
          
          <TabsContent value="tickets" className="mt-4">
            <TicketsTab group={group} />
          </TabsContent>
          
          <TabsContent value="flights" className="mt-4">
            <FlightsTab group={group} />
          </TabsContent>
          
          <TabsContent value="vouchers" className="mt-4">
            <VouchersTab group={group} />
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const AssignmentsTab = ({ group }) => {
    const assignments = [
      {
        role: 'Tour Guide',
        icon: User,
        assignment: group.guide_assignment,
        required: true,
      },
      {
        role: 'Driver',
        icon: Car,
        assignment: group.driver_assignment,
        required: group.group_type !== 'INDIVIDUAL',
      },
      {
        role: 'Coordinator',
        icon: UserPlus,
        assignment: group.coordinator_assignment,
        required: group.total_participants > 20,
      },
    ];
    
    return (
      <div className="space-y-4">
        {assignments.map((item) => (
          <Card key={item.role}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${item.assignment ? 'bg-green-100' : 'bg-red-100'}`}>
                    <item.icon className={`w-6 h-6 ${item.assignment ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">{item.role}</h3>
                    {item.assignment ? (
                      <div className="space-y-1 mt-2">
                        <p className="text-sm">{item.assignment.guide_name}</p>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {item.assignment.guide_phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {item.assignment.guide_email}
                          </span>
                        </div>
                        {item.assignment.languages && item.assignment.languages.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {item.assignment.languages.map(lang => (
                              <Badge key={lang} variant="outline" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">Not assigned</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!item.assignment && item.required && (
                    <Badge variant="destructive">Required</Badge>
                  )}
                  <Button
                    size="sm"
                    variant={item.assignment ? 'outline' : 'default'}
                    onClick={() => {
                      setAssignmentForm({ ...assignmentForm, role: item.role.toLowerCase() });
                      setShowAssignmentDialog(true);
                    }}
                  >
                    {item.assignment ? 'Change' : 'Assign'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const HotelsTab = ({ group }) => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Hotel Reservations</h3>
          <Button size="sm" onClick={() => setShowServiceDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Hotel
          </Button>
        </div>
        
        {group.hotel_reservations && group.hotel_reservations.length > 0 ? (
          <div className="space-y-4">
            {group.hotel_reservations.map((hotel, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-semibold">{hotel.hotel_name}</h4>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {hotel.hotel_address}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          {hotel.hotel_phone}
                        </p>
                        <p className="flex items-center gap-2">
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(hotel.check_in_date), 'MMM dd')} - 
                          {format(new Date(hotel.check_out_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          {hotel.total_rooms} rooms, {hotel.total_guests} guests
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge>{hotel.meal_plan}</Badge>
                        <Badge className={getStatusColor(hotel.status)}>
                          {SERVICE_STATUS[hotel.status]}
                        </Badge>
                        {hotel.voucher_number && (
                          <Badge variant="outline">
                            <QrCode className="w-3 h-3 mr-1" />
                            {hotel.voucher_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateVoucher('accommodation', hotel)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No hotel reservations yet
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const RestaurantsTab = ({ group }) => {
    // Similar implementation to HotelsTab
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Restaurant Reservations</h3>
          <Button size="sm" onClick={() => setShowServiceDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Restaurant
          </Button>
        </div>
        {/* Restaurant list similar to hotels */}
      </div>
    );
  };

  const TicketsTab = ({ group }) => {
    // Similar implementation to HotelsTab
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Entrance Tickets</h3>
          <Button size="sm" onClick={() => setShowServiceDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tickets
          </Button>
        </div>
        {/* Tickets list similar to hotels */}
      </div>
    );
  };

  const FlightsTab = ({ group }) => {
    // Similar implementation to HotelsTab
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Flight Information</h3>
          <Button size="sm" onClick={() => setShowServiceDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Flight
          </Button>
        </div>
        {/* Flights list similar to hotels */}
      </div>
    );
  };

  const VouchersTab = ({ group }) => {
    const [vouchers, setVouchers] = useState([]);
    
    useEffect(() => {
      fetchVouchers();
    }, [group]);
    
    const fetchVouchers = async () => {
      try {
        const response = await fetch(`/api/vouchers/group/${group.group_id}`);
        const data = await response.json();
        setVouchers(data);
      } catch (error) {
        console.error('Error fetching vouchers:', error);
      }
    };
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Vouchers</h3>
          <Button
            size="sm"
            onClick={() => {
              const voucherIds = vouchers.map(v => v.voucher_id);
              if (voucherIds.length > 0) {
                printVouchers(voucherIds);
              }
            }}
            disabled={vouchers.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print All Vouchers
          </Button>
        </div>
        
        {vouchers.length > 0 ? (
          <div className="space-y-2">
            {vouchers.map(voucher => (
              <Card key={voucher.voucher_id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <QrCode className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-semibold">{voucher.voucher_number}</p>
                        <p className="text-sm text-gray-500">
                          {voucher.service_name} - {voucher.service_provider}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(voucher.status.toUpperCase())}>
                        {VOUCHER_STATUS[voucher.status.toUpperCase()]}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => printVouchers([voucher.voucher_id])}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No vouchers generated yet
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ================== Main Render ==================

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Group Coordination</h1>
          <p className="text-gray-500">Manage groups, assignments, and services</p>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={() => setShowGroupDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search groups..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.groupType}
              onValueChange={(value) => setFilters({ ...filters, groupType: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(GROUP_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(SERVICE_STATUS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={fetchGroups}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Groups</h2>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-4 pr-4">
                {groups.map(group => (
                  <GroupCard key={group.group_id} group={group} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No groups found
                </CardContent>
              </Card>
            )}
          </ScrollArea>
        </div>
        
        {/* Group Details */}
        <div className="lg:col-span-2">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <GroupDetails group={selectedGroup} />
          </ScrollArea>
        </div>
      </div>
      
      {/* Dialogs */}
      
      {/* Create Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Enter the group details to create a new coordination entry.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Group Name</Label>
                <Input
                  value={groupForm.group_name}
                  onChange={(e) => setGroupForm({ ...groupForm, group_name: e.target.value })}
                  placeholder="Enter group name"
                />
              </div>
              
              <div>
                <Label>Group Type</Label>
                <Select
                  value={groupForm.group_type}
                  onValueChange={(value) => setGroupForm({ ...groupForm, group_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GROUP_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={groupForm.start_date}
                  onChange={(e) => setGroupForm({ ...groupForm, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={groupForm.end_date}
                  onChange={(e) => setGroupForm({ ...groupForm, end_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Total Participants</Label>
                <Input
                  type="number"
                  value={groupForm.total_participants}
                  onChange={(e) => setGroupForm({ ...groupForm, total_participants: parseInt(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <Label>Notes</Label>
              <Textarea
                value={groupForm.notes}
                onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {assignmentForm.role}</DialogTitle>
            <DialogDescription>
              Enter the details of the {assignmentForm.role} to assign to this group.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={assignmentForm.name}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            
            <div>
              <Label>Phone</Label>
              <Input
                value={assignmentForm.phone}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={assignmentForm.email}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            
            {assignmentForm.role === 'driver' && (
              <div>
                <Label>License Number</Label>
                <Input
                  value={assignmentForm.license}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, license: e.target.value })}
                  placeholder="Driver license number"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={assignPersonnel}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Select the information you want to include in the report.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Report Type</Label>
              <Select
                value={reportConfig.report_type}
                onValueChange={(value) => setReportConfig({ ...reportConfig, report_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complete">Complete Report</SelectItem>
                  <SelectItem value="summary">Summary Only</SelectItem>
                  <SelectItem value="rooming">Rooming List</SelectItem>
                  <SelectItem value="flight">Flight Manifest</SelectItem>
                  <SelectItem value="vouchers">Vouchers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Include Sections</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={reportConfig.include_guide_info}
                    onCheckedChange={(checked) => 
                      setReportConfig({ ...reportConfig, include_guide_info: checked })
                    }
                  />
                  <Label>Guide Information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={reportConfig.include_hotel_info}
                    onCheckedChange={(checked) => 
                      setReportConfig({ ...reportConfig, include_hotel_info: checked })
                    }
                  />
                  <Label>Hotel Information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={reportConfig.include_restaurant_info}
                    onCheckedChange={(checked) => 
                      setReportConfig({ ...reportConfig, include_restaurant_info: checked })
                    }
                  />
                  <Label>Restaurant Information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={reportConfig.include_entrance_info}
                    onCheckedChange={(checked) => 
                      setReportConfig({ ...reportConfig, include_entrance_info: checked })
                    }
                  />
                  <Label>Entrance Tickets</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={reportConfig.include_flight_info}
                    onCheckedChange={(checked) => 
                      setReportConfig({ ...reportConfig, include_flight_info: checked })
                    }
                  />
                  <Label>Flight Information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={reportConfig.include_vouchers}
                    onCheckedChange={(checked) => 
                      setReportConfig({ ...reportConfig, include_vouchers: checked })
                    }
                  />
                  <Label>Vouchers</Label>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Output Format</Label>
                <Select
                  value={reportConfig.output_format}
                  onValueChange={(value) => setReportConfig({ ...reportConfig, output_format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Language</Label>
                <Select
                  value={reportConfig.language}
                  onValueChange={(value) => setReportConfig({ ...reportConfig, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={generateReport}>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupCoordinationDashboard;