import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { 
    getAllCentersGQL, 
    getCenterInfoByIdGQL,
    createCenterGQL, 
    updateCenterGQL, 
    deleteCenterGQL
} from "../apiV2/center_service/graphql/center.api";

import { uploadImageREST } from "../apiV2/center_service/rest/center.api";
import LoadingSpinner from "../components/LoadingSpinner";
import { ROLES } from "../constants/roles";
import { MdLocationOn, MdEdit, MdClose, MdDelete, MdAdd, MdCloudUpload, MdPerson } from "react-icons/md";

// =================================================================================
// --- Helper: Image Upload Box ---
// =================================================================================
const ImageUploadBox = ({ label, images, onAdd, onRemove, isMultiple = false }) => (
    <div style={{ marginBottom: '15px' }}>
        <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>{label}</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <img 
                        src={img.preview || img.url} 
                        alt="Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} 
                    />
                    <button type="button" onClick={() => onRemove(idx)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', border: 'none', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
            ))}
            
            {(isMultiple || images.length === 0) && (
                <label style={{ 
                    width: '100px', height: '100px', border: '2px dashed #ccc', borderRadius: '8px', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                    cursor: 'pointer', color: '#666', background: '#FAFAFA'
                }}>
                    <MdCloudUpload size={24} />
                    <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>{isMultiple ? 'Thêm ảnh' : 'Chọn ảnh'}</span>
                    <input 
                        type="file" accept="image/*" multiple={isMultiple} 
                        onChange={(e) => onAdd(e.target.files)} style={{ display: 'none' }} 
                    />
                </label>
            )}
        </div>
    </div>
);

// =================================================================================
// --- Helper Component: TimeSlot Row ---
// =================================================================================
const TimeSlotRow = ({ slot, onChange, onRemove }) => (
    <div style={{ display: 'flex', gap: '5px', marginBottom: '5px', alignItems: 'center' }}>
        <input type="time" value={slot.startTime || ''} onChange={e => onChange('startTime', e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ddd'}} />
        <span>-</span>
        <input type="time" value={slot.endTime || ''} onChange={e => onChange('endTime', e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ddd'}} />
        <input type="number" placeholder="Giá" value={slot.price || ''} onChange={e => onChange('price', parseFloat(e.target.value))} style={{width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd'}} />
        <button type="button" onClick={onRemove} style={{color: 'red', border: 'none', background: 'none', cursor: 'pointer'}}>X</button>
    </div>
);


// =================================================================================
// --- Modal Component ---
// =================================================================================
const CenterModal = ({ center, isOpen, onClose, onSave, isCreating }) => {
    const defaultPricing = { weekday: [], weekend: [] };
    const [formData, setFormData] = useState({});
    const [logoImage, setLogoImage] = useState([]); 
    const [galleryImages, setGalleryImages] = useState([]); 
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (center && !isCreating) {
                // EDIT MODE: Load data
                setFormData({
                    ...center,
                    pricing: center.pricing || defaultPricing,
                    facilitiesString: center.facilities ? center.facilities.join(', ') : ''
                });
                
                // Map Logo
                if (center.logoUrl && center.logo_file_id) {
                    setLogoImage([{ url: center.logoUrl, id: center.logo_file_id, file: null }]);
                } else setLogoImage([]);

                // Map Gallery
                if (center.imageUrlList && center.image_file_ids) {
                    const mapped = center.imageUrlList.map((url, i) => ({
                        url, id: center.image_file_ids[i], file: null
                    }));
                    // Lọc những ảnh không có ID, tránh lỗi khi map
                    setGalleryImages(mapped.filter(item => item.id)); 
                } else setGalleryImages([]);
            } else {
                // CREATE MODE: Reset form
                setFormData({
                    name: '', address: '', phone: '', description: '', 
                    totalCourts: 0, googleMapUrl: '', isActive: true,
                    facilitiesString: '', pricing: defaultPricing
                });
                setLogoImage([]);
                setGalleryImages([]);
            }
        }
    }, [center, isOpen, isCreating]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handlePricingChange = (type, index, field, value) => {
        const newPricing = { ...formData.pricing };
        newPricing[type] = [...newPricing[type]];
        newPricing[type][index] = { ...newPricing[type][index], [field]: value };
        setFormData(prev => ({ ...prev, pricing: newPricing }));
    };

    const addTimeSlot = (type) => {
        const newPricing = { ...formData.pricing };
        newPricing[type] = [...(newPricing[type] || []), { startTime: '08:00', endTime: '09:00', price: 50000 }];
        setFormData(prev => ({ ...prev, pricing: newPricing }));
    };

    const removeTimeSlot = (type, index) => {
        const newPricing = { ...formData.pricing };
        newPricing[type] = newPricing[type].filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, pricing: newPricing }));
    };

    const handleAddImages = (files, type) => {
        const newImages = Array.from(files).map(file => ({
            file,
            preview: URL.createObjectURL(file),
            id: null,
            url: null
        }));
        if (type === 'logo') setLogoImage(newImages.slice(0, 1));
        else setGalleryImages(prev => [...prev, ...newImages]);
    };

    const handleRemoveImage = (index, type) => {
        if (type === 'logo') setLogoImage([]);
        else setGalleryImages(prev => prev.filter((_, i) => i !== index));
    };

    /**
     * Hàm chuẩn hóa data trước khi gửi GraphQL
     * @param {object} data - Dữ liệu form
     * @param {boolean} isCreation - Có phải chế độ tạo mới hay không
     * @returns {object} Dữ liệu đã được làm sạch
     */
    const sanitizeData = (data, isCreation = false) => {
        const submit = {
            ...data,
            totalCourts: parseInt(data.totalCourts),
            facilities: data.facilitiesString ? data.facilitiesString.split(',').map(f => f.trim()).filter(f => f !== '') : [],
        };

        // Xóa các trường UI/Readonly/Thừa
        delete submit.facilitiesString;
        delete submit.logoUrl;
        delete submit.imageUrlList;
        delete submit.coverImage;
        delete submit._id;
        delete submit.logo_file_id;
        delete submit.imageFileIds;
        delete submit.bookingCount;
        delete submit.avgRating;
        delete submit.centerManagerId;
        
        // Trường centerId chỉ là tham số cho updateGQL, không nằm trong Input object
        if (!isCreation) {
            delete submit.centerId;
        }

        // Sanitize Pricing
        if (submit.pricing) {
            const cleanSlots = (slots) => slots?.map(({ startTime, endTime, price }) => ({ 
                startTime, 
                endTime, 
                price: parseFloat(price) 
            })) || [];
            
            submit.pricing = {
                weekday: cleanSlots(submit.pricing.weekday),
                weekend: cleanSlots(submit.pricing.weekend)
            };
        }
        return submit;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        let currentCenterId = center?.centerId; 

        try {
            // Chuẩn bị data cơ bản (chưa có ID ảnh)
            let baseData = sanitizeData(formData, isCreating);
            let finalLogoId = null;
            let finalGalleryIds = [];
            
            // --- 1. LUỒNG TẠO MỚI (CREATE) ---
            if (isCreating) {
                // 1.1. GỌI API TẠO MỚI ĐẦU TIÊN (chưa có ID ảnh)
                const createResult = await createCenterGQL({
                    ...baseData,
                    logoFileId: null,
                    image_file_ids: []
                });
                currentCenterId = createResult.centerId; 
                
                if (!currentCenterId) throw new Error("Không lấy được ID trung tâm sau khi tạo.");
                
                // 1.2. UPLOAD ẢNH bằng Center ID mới
                if (logoImage.length && logoImage[0]?.file) {
                    const res = await uploadImageREST(currentCenterId, logoImage[0].file, 'logo');
                    finalLogoId = res.fileId;
                }

                const newImagesToUpload = galleryImages.filter(img => img.file);
                const uploadPromises = newImagesToUpload.map(img => uploadImageREST(currentCenterId, img.file, 'gallery'));
                const uploadResults = await Promise.all(uploadPromises);
                finalGalleryIds = uploadResults.map(res => res.fileId);

                // 1.3. CẬP NHẬT TRUNG TÂM lần 2 với ID ảnh
                const updatePhotoData = { 
                    logoFileId: finalLogoId,
                    image_file_ids: finalGalleryIds
                };

                await updateCenterGQL(currentCenterId, updatePhotoData);
                
            // --- 2. LUỒNG CẬP NHẬT (UPDATE) ---
            } else {
                // Đảm bảo có centerId để upload
                if (!currentCenterId) throw new Error("Không tìm thấy Center ID để cập nhật.");

                // 2.1. Upload ảnh mới và giữ lại ID ảnh cũ
                if (logoImage.length && logoImage[0]?.file) {
                    const res = await uploadImageREST(currentCenterId, logoImage[0].file, 'logo');
                    finalLogoId = res.fileId;
                } else {
                    finalLogoId = logoImage[0]?.id || null; // Giữ lại ID cũ nếu không upload mới
                }

                const oldGalleryIds = galleryImages.filter(img => !img.file && img.id).map(img => img.id);
                const newImagesToUpload = galleryImages.filter(img => img.file);
                
                const uploadPromises = newImagesToUpload.map(img => uploadImageREST(currentCenterId, img.file, 'gallery'));
                const uploadResults = await Promise.all(uploadPromises);
                const newGalleryIds = uploadResults.map(res => res.fileId);
                
                finalGalleryIds = [...oldGalleryIds, ...newGalleryIds];

                // 2.2. Gửi data cập nhật hoàn chỉnh
                const finalUpdateData = {
                    ...baseData,
                    logoFileId: finalLogoId,
                    image_file_ids: finalGalleryIds
                };
                
                await updateCenterGQL(currentCenterId, finalUpdateData);
            }

            // Hoàn thành
            await onSave(); // Gọi hàm loadData từ component cha
            onClose();

        } catch (error) {
            console.error(error);
            alert("Lỗi khi xử lý: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>{isCreating ? 'Thêm Mới' : 'Cập Nhật'} Trung Tâm</h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><MdClose size={24} /></button>
                </div>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                        <ImageUploadBox label="Logo (1 ảnh)" images={logoImage} onAdd={(f) => handleAddImages(f, 'logo')} onRemove={(i) => handleRemoveImage(i, 'logo')} />
                        <ImageUploadBox label="Gallery (Nhiều ảnh)" images={galleryImages} onAdd={(f) => handleAddImages(f, 'gallery')} onRemove={(i) => handleRemoveImage(i, 'gallery')} isMultiple={true} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div><label style={{fontWeight: '600', fontSize: '0.9rem'}}>Tên *</label><input required name="name" value={formData.name || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                        <div><label style={{fontWeight: '600', fontSize: '0.9rem'}}>SĐT *</label><input required name="phone" value={formData.phone || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    </div>
                    <div><label style={{fontWeight: '600', fontSize: '0.9rem'}}>Địa chỉ *</label><input required name="address" value={formData.address || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                        <div><label style={{fontWeight: '600', fontSize: '0.9rem'}}>Số sân</label><input type="number" name="totalCourts" value={formData.totalCourts || 0} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                        <div><label style={{fontWeight: '600', fontSize: '0.9rem'}}>Google Map URL</label><input name="googleMapUrl" value={formData.googleMapUrl || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    </div>

                    <div><label style={{fontWeight: '600', fontSize: '0.9rem'}}>Mô tả</label><textarea name="description" rows="3" value={formData.description || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    <div><label style={{fontWeight: '600', fontSize: '0.9rem'}}>Tiện ích (phân cách phẩy)</label><input name="facilitiesString" value={formData.facilitiesString || ''} onChange={handleChange} placeholder="Wifi, Điều hòa..." style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                    
                    <div style={{borderTop: '1px solid #eee', paddingTop: '15px'}}>
                        <h4 style={{margin: '0 0 10px 0'}}>Bảng giá</h4>
                        <div style={{display: 'flex', gap: '20px'}}>
                            <div style={{flex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                    <label style={{fontWeight: '600'}}>Ngày thường</label>
                                    <button type="button" onClick={() => addTimeSlot('weekday')} style={{fontSize: '0.8rem', background: '#E5E7EB', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer'}}>+ Thêm</button>
                                </div>
                                {formData.pricing?.weekday?.map((slot, idx) => (
                                    <TimeSlotRow key={idx} slot={slot} onChange={(f, v) => handlePricingChange('weekday', idx, f, v)} onRemove={() => removeTimeSlot('weekday', idx)} />
                                ))}
                            </div>
                            <div style={{flex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                                    <label style={{fontWeight: '600'}}>Cuối tuần</label>
                                    <button type="button" onClick={() => addTimeSlot('weekend')} style={{fontSize: '0.8rem', background: '#E5E7EB', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer'}}>+ Thêm</button>
                                </div>
                                {formData.pricing?.weekend?.map((slot, idx) => (
                                    <TimeSlotRow key={idx} slot={slot} onChange={(f, v) => handlePricingChange('weekend', idx, f, v)} onRemove={() => removeTimeSlot('weekend', idx)} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {!isCreating && (
                        <div style={{marginTop: '10px'}}><label style={{cursor: 'pointer'}}><input type="checkbox" name="isActive" checked={formData.isActive || false} onChange={handleChange} /> Đang hoạt động</label></div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <button type="button" onClick={onClose} disabled={isUploading} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                        <button type="submit" disabled={isUploading} style={{ padding: '10px 20px', background: isUploading ? '#86EFAC' : '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', minWidth: '120px' }}>
                            {isUploading ? <LoadingSpinner size="small" color="white" /> : (isCreating ? 'Tạo Mới' : 'Lưu Lại')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// =================================================================================
// --- Main Page ---
// =================================================================================
const CenterManagement = () => {
    const navigate = useNavigate();
    const { admin } = useContext(AuthContext); 
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getAllCentersGQL();
            setCenters(data.map(c => ({
                ...c, coverImage: c.imageUrlList?.[0] || c.logoUrl
            })));
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const myCenters = useMemo(() => {
        if (!admin || !centers.length) return [];
        if (admin.role === ROLES.SUPER_ADMIN) return centers;
        const userId = admin.userId.replace("USER-", "");
        return centers.filter(c => (c.centerManagerId || "").replace("USER-", "") === userId);
    }, [centers, admin]);

    const handleCreate = () => {
        setSelectedCenter(null);
        setIsCreating(true);
        setIsModalOpen(true);
    };

    const handleEdit = async (e, centerSummary) => {
        e.stopPropagation();
        try {
            const detail = await getCenterInfoByIdGQL(centerSummary.centerId);
            setSelectedCenter(detail);
            setIsCreating(false);
            setIsModalOpen(true);
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Bạn có chắc chắn muốn xóa?")) {
            try {
                await deleteCenterGQL(id);
                loadData();
            } catch (err) { alert(err.message); }
        }
    };

    // Hàm onSave: Bây giờ chỉ có nhiệm vụ load lại dữ liệu sau khi Modal hoàn tất API
    const handleSave = async () => {
        loadData();
        alert("Lưu/Tạo Trung tâm thành công!");
    };

    if (loading) return <LoadingSpinner fullPage />;

    return (
        <div style={{ padding: "30px", background: "#F9FAFB", minHeight: "100vh" }}>
            <CenterModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                center={selectedCenter} 
                isCreating={isCreating} 
                onSave={handleSave} 
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Quản Lý Trung Tâm</h1>
                    <p style={{ color: '#666' }}>Danh sách các cơ sở cầu lông</p>
                </div>
                {admin?.role === ROLES.SUPER_ADMIN && (
                    <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#10B981', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }}>
                        <MdAdd size={20} /> Thêm Mới
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {myCenters.map(c => (
                    <div key={c.centerId} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: '5px' }}>
                            <button onClick={(e) => handleEdit(e, c)} style={{ background: '#fff', padding: '5px', borderRadius: '50%', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}><MdEdit color="blue" /></button>
                            <button onClick={(e) => handleDelete(e, c.centerId)} style={{ background: '#fff', padding: '5px', borderRadius: '50%', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}><MdDelete color="red" /></button>
                        </div>
                        <img src={c.coverImage || '/default.png'} style={{ width: '100%', height: '180px', objectFit: 'cover' }} alt="" onError={(e) => e.target.src = '/default.png'} />
                        <div style={{ padding: '15px' }}>
                            <h3 style={{ margin: '0 0 5px 0' }}>{c.name}</h3>
                            <div style={{ display: "flex", alignItems: "start", gap: "8px", color: "#6B7280", marginBottom: "8px", fontSize: "0.9rem" }}>
                                <MdLocationOn style={{ marginTop: "3px", flexShrink: 0 }} />
                                <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {c.address}
                                </span>
                            </div>
                            {admin?.role === ROLES.SUPER_ADMIN && (
                               <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#3B82F6", fontSize: "0.85rem", background: "#EFF6FF", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                                    <MdPerson />
                                    <span>Manager ID: {c.centerManagerId ? c.centerManagerId.substring(0, 15) + "..." : "N/A"}</span>
                               </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CenterManagement;    